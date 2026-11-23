# Setubandh AI

**An AI sales and support inbox for WhatsApp, Instagram and Messenger.** One shared inbox for a business's team, with an AI assistant that answers customers 24/7 from the business's own products, prices and FAQs, and hands over to a human whenever needed.

> **Status: foundations in progress.** The monorepo and test harness are in place (M1-01, M1-01a); product features start at M1-09. The docs use the working name **Orbit** for this product (see requirements Q-01).

## What it is

Setubandh AI is a multi-tenant SaaS. Businesses (tenants) connect their own WhatsApp number, Facebook Page and Instagram account, then:

- read and reply to every DM from one real-time shared inbox, with assignment, notes and history;
- let an AI assistant answer from their catalogue and FAQs, qualify leads, take orders and book calls (MVP 2 onward);
- take over any conversation from the AI, and hand it back, at any time;
- track leads through a pipeline, with follow-ups, analytics and billing (later milestones).

A platform Super Admin panel manages tenants, plans, billing, usage and channel health.

## Roadmap

| Milestone | What a business gets | Build window | Plan |
|---|---|---|---|
| **MVP 1: Unified inbox** | Shared inbox for WhatsApp, Instagram, Messenger | 23 Nov 2026 – 17 Jan 2027 | [docs/plan/01-mvp-1-unified-inbox.md](docs/plan/01-mvp-1-unified-inbox.md) |
| **MVP 2: AI answers** | AI replies from products, FAQs and documents | 18 Jan – 21 Feb 2027 | [docs/plan/02-mvp-2-ai-answers.md](docs/plan/02-mvp-2-ai-answers.md) |
| M3: Get paid | Plans, billing, limits, full Super Admin | 22 Feb – 14 Mar 2027 | [docs/plan/03-later-milestones-m3-m6.md](docs/plan/03-later-milestones-m3-m6.md) |
| M4: Sell in chat | Pipeline, orders, bookings, payment links | 15 Mar – 4 Apr 2027 | same file |
| M5: Automate | Follow-ups, comment-to-DM, broadcasts | 5 – 25 Apr 2027 | same file |
| M6: Insights and scale | Reports, API, web chat, mobile, white-label | From 26 Apr 2027 | same file |

Dates are indicative. Public beta also depends on Meta App Review approval.

## Planned tech stack

Details and rationale: [requirements §4](docs/requirements.md) and [ADR 0011](docs/adr/0011-backend-stack-refresh.md).

| Layer | Choice |
|---|---|
| Language / runtime | TypeScript, Node.js 26 LTS |
| Backend | NestJS 12 (Fastify), modular monolith + BullMQ worker |
| Data | PostgreSQL 18 (pgvector, RLS for tenant isolation), Valkey 8.1, Cloudflare R2 (S3 API) |
| Realtime | Socket.IO |
| AI | Claude API (Haiku default, Sonnet escalation) |
| Frontend | React 19, Vite 8, Astryx components themed with Paper & Pastel, Tailwind v4 |
| Monorepo / tooling | pnpm workspaces, Turborepo, Vitest, Playwright |
| Infra | Docker Compose on a self-hosted VPS, Caddy, GitLab CI / GitHub Actions |

## Repository layout

```
.
├─ README.md
├─ CLAUDE.md                  Rules for Claude Code (read automatically)
├─ .claude/
│  ├─ settings.json           Shared permissions (secrets and force-push denied)
│  ├─ commands/               /ticket, /rls-check, /ui-review, /evals
│  └─ skills/paper-pastel-studio/   Design-system skill used for all UI work
├─ .github/                   PR template and ticket issue template
├─ .env.example               Environment variable names (no values)
├─ docs/
│  ├─ requirements.md         Full PRD + TRD (source of truth)
│  ├─ plan/                   Milestone plans and tickets (MVP 1, MVP 2, M3–M6)
│  ├─ prototype/              Interactive HTML UI prototype
│  ├─ adr/                    Architecture decision records
│  └─ runbooks/               Operations runbooks (skeleton)
└─ (apps/, packages/, infra/ appear as tickets M1-01 to M1-06 land)
```

The planned code layout (`apps/api`, `apps/worker`, `apps/web`, `apps/admin`, `packages/*`, `infra/*`) is in [requirements §4.5](docs/requirements.md).

## Documentation

| Read this | For |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Product, architecture, multi-tenancy, roles, functional requirements, AI design, Meta integration, data model, testing, ticket roadmap |
| [docs/plan/](docs/plan/) | What to build, in what order, per milestone, with acceptance criteria |
| [docs/prototype/setubandh_prototype.html](docs/prototype/setubandh_prototype.html) | Open in a browser to click through the intended UI |
| [docs/adr/](docs/adr/) | Settled architecture decisions |

## Getting started

Requirements: Node 26 (see `.nvmrc`), pnpm 12 (`corepack enable`), Docker.

```bash
pnpm install
pnpm env:init   # creates .env with local defaults and random secrets (never commit it)
pnpm dev        # checks .env, starts the Docker services, then api, worker, web and admin
```

| What | Where |
|---|---|
| Web app | http://localhost:5173 |
| Admin app | http://localhost:5174 |
| API | http://localhost:3000 |
| Email inbox (Mailpit) | http://localhost:8025 |
| Postgres 18 + pgvector | `127.0.0.1:5432`, database `setubandh` |
| Valkey 8.1 | `127.0.0.1:6379` |
| S3 (SeaweedFS, stands in for R2) | http://127.0.0.1:8333 |

Services only: `pnpm dev:services`, stop with `pnpm dev:services:down`, wipe local data with `pnpm dev:services:reset`. Check `.env` without starting anything: `pnpm env:check`. An app that finds a missing or invalid variable stops and names it.

Tests:

```bash
pnpm --filter @setubandh/web exec playwright install --with-deps   # browsers, once
pnpm lint && pnpm typecheck && pnpm test
pnpm test:integration   # real Postgres 18 + Valkey and the dev stack, in Docker
pnpm test:browser       # React component tests in real Chromium
pnpm test:e2e           # Playwright: 3 browsers x desktop/phone x light/dark, axe + screenshots
```

Testing guide: [docs/testing.md](docs/testing.md).

Production images (built by CI for every push, pushed to GHCR from `main`):

```bash
pnpm build                                                                   # compile packages and apps with SWC
docker build -f infra/docker/node-app.Dockerfile --build-arg APP=api -t setubandh-api .
docker build -f infra/docker/static-app.Dockerfile --build-arg APP=web -t setubandh-web .
```

## Working with Claude Code

This project is built ticket by ticket with Claude Code. Setup is committed in the repo:

- `CLAUDE.md` holds the non-negotiable rules (tenant isolation, Zod validation, permissions, no secrets in logs, UI rules).
- `.claude/settings.json` allows safe read-only commands and blocks reading `.env`, force-push, pushing to `main` and destructive deletes.
- Slash commands: `/ticket <ID>` loads a ticket and proposes a plan before any code; `/rls-check` audits the diff for tenant-isolation gaps; `/ui-review` runs the Paper & Pastel review; `/evals` runs AI evals (MVP 2+).
- The `paper-pastel-studio` skill in `.claude/skills/` is used for all UI work.
- Engineering skills from [mattpocock/skills](https://github.com/mattpocock/skills) live in `.claude/skills/` too (for example `/grill-with-docs`, `/tdd`, `/to-tickets`). Domain terms are in [`GLOSSARY.md`](GLOSSARY.md).

Workflow: **one ticket = one branch = one session.** Start with `/ticket M1-01`, review the plan, then implement with tests. Details: [requirements §17](docs/requirements.md).

Put personal overrides in `.claude/settings.local.json` or `CLAUDE.local.md` (both git-ignored).

## Contributing

- Branch per ticket: `m1-09-auth-core`. Conventional Commits with the ticket ID: `feat(inbox): take over conversation [M1-23]`.
- Open PRs against `main` using the PR template; merge only after review. Do not push directly to `main`.
- If a decision changes, update `docs/` first (new ADR in `docs/adr/`), then the code.

## License

Not yet chosen. Until a license is added, all rights are reserved.
