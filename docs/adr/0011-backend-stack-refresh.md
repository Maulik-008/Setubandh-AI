# 0011. Backend stack refresh before M1-01

- Status: accepted
- Date: 2026-11-22
- Amends: ADR-01 (runtime and framework versions), requirements §4.3, §5.4, §14.1, §15

## Context

The backend stack in requirements §4.3 was written months before coding starts on 23 Nov 2026. A review before ticket M1-01 checked it against the real team (one TypeScript developer with Claude Code), the real launch scale (about 10 workspaces at first, 100 as the later goal), self-hosting on one VPS, and the current versions and licences of each component (checked 2026-11-22):

- Node.js 22 reaches end of life on 2027-04-30, three months after the MVP 1 launch. Node 26 has been Active LTS since 2026-10-28 (supported until 2029-04).
- NestJS 12 has been the current major version since 2026-08-27; 11.x is tagged legacy.
- PostgreSQL 18 is at 18.7 and pgvector ships official images for it. PostgreSQL 19 was released 2026-11-19 and is too new for production.
- Redis 7.4 and later are not OSI open source (RSAL/SSPL; Redis 8 adds AGPL). Valkey is the BSD-licensed fork; BullMQ recommends Valkey 8.1 because 9.0 was slower in its benchmarks.
- BullMQ v6 (OSS, MIT) is current. Per-tenant fairness ("Groups") is a paid BullMQ Pro feature, so §5.4 could not be built on the OSS version as written.
- MinIO's community repository was archived in April 2026: source only, no binaries or images, unpatched CVEs reported.
- Drizzle 1.0 is still a release candidate with breaking changes between RCs; 0.45.x is the stable line.

## Decision

Keep the architecture and the settled ADRs (TypeScript, NestJS on Fastify, modular monolith + worker, PostgreSQL with RLS and pgvector, Drizzle, BullMQ, Socket.IO, hand-built auth, self-hosted Docker Compose + Caddy). Change versions and components as follows:

| Area | Was | Now |
|---|---|---|
| Runtime | Node.js 22 | **Node.js 26 LTS** |
| Framework | NestJS 11 | **NestJS 12** (Fastify 5 adapter) |
| Database | PostgreSQL 17 | **PostgreSQL 18** + pgvector |
| ORM | Drizzle (unpinned) | **Drizzle 0.45.x pinned**; upgrade to 1.0 when it reaches GA, while few migrations exist |
| Queue / cache | BullMQ on Redis 7 | **BullMQ v6 (OSS) on Valkey 8.1** |
| Per-workspace fairness | BullMQ groups | **Own per-workspace concurrency cap** (Valkey counter) plus job priorities; BullMQ Pro reconsidered only if needed |
| Realtime fan-out | Socket.IO Redis adapter | Socket.IO 4 with the **Redis Streams adapter** (Valkey-compatible) |
| Media storage | MinIO, self-hosted | **Cloudflare R2** via the S3 API (code stays S3-generic) |
| Off-site backups | Any S3-compatible bucket | **Separate R2 bucket**, client-side encrypted (pgBackRest or WAL-G) |
| Local / CI object storage | MinIO | A lightweight S3-compatible container (SeaweedFS S3 gateway), so tests run offline |
| Process layout at launch | 2 API + 2 worker + scheduler | **1 API + 1 worker**; the scheduler is a worker mode with a leader lock. Code stays stateless so replicas can be added by config |
| Design scale | 100 workspaces at launch | **About 10 workspaces at launch**; the §14.1 numbers remain the scale-out target |

Ticket M1-01 does not start until this ADR is merged.

## Alternatives considered

- **Go, Elixir/Phoenix or Bun instead of Node.** Rejected: there's no shared types with the React apps, and the extra language slows one developer down. Node has ample headroom at about 100 messages per second.
- **Hono or plain Fastify instead of NestJS.** Rejected: we would have to build our own module, guard and dependency-injection conventions. NestJS guards map directly onto `TenantGuard` and `@RequirePermission`.
- **pg-boss with no Redis.** One fewer service, and jobs could be created in the same transaction as the data. Rejected for now because locks, caching and socket fan-out would also have to move to Postgres, and the documented design and BullMQ's deduplication and rate limiting already fit.
- **BullMQ Pro.** Not needed at about 10 workspaces.
- **Self-hosted SeaweedFS, Garage or RustFS for media.** Rejected for production: they add operations and backup work for one developer. R2 has zero egress fees and costs almost nothing at this scale.
- **Drizzle 1.0 RC.** Rejected: churn between release candidates during week 1. **Prisma 7 or Kysely** were also rejected: Prisma is awkward with per-transaction `SET LOCAL`, and Kysely has no schema or migration tooling.
- **Better Auth or a hosted auth service.** Rejected: neither fits two login realms and RLS context as cleanly, and hosted auth adds per-user cost and moves data off the server.
- **PostgreSQL 17 or 19.** 17 has a shorter support life. 19 is days old; reconsider once it reaches 19.2 or later.

## Consequences

- Cloudflare becomes a sub-processor, and media is stored outside India. The privacy policy and the DPA sub-processor list (§14.4) must say so.
- Per-workspace fairness is our own code and needs a test: one workspace's backlog must not delay another workspace's AI replies.
- A rolling deploy with a single API replica causes a brief interruption. That is acceptable at beta scale; add a second replica before paid launch (M3) if needed.
- Dependency versions are pinned. Drizzle 1.0 and PostgreSQL 19 are tracked as follow-up upgrades.
