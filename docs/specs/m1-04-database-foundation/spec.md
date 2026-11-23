# M1-04: Database foundation with row-level security

Ticket: M1-04
Status: ready-for-human (implemented 2026-11-23; awaiting your review)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 1](../../plan/01-mvp-1-unified-inbox.md)
Requirements: §5.2 (isolation), §11.1 (conventions), §11.2 (platform tables), §15.4 (migrations)
Skill: `postgres-best-practices` (RLS basics and performance, privileges, primary keys, FK indexes)

## Problem Statement

Isolation between workspaces must not depend on every query remembering a `WHERE tenant_id = …`. One forgotten filter would leak one business's customers to another (requirements G-security, "Cross-workspace data incidents: 0").

## Solution

The database enforces it. The app connects as `orbit_app`, which cannot bypass row-level security. Tenant data is only reachable inside `db.withTenant(tenantId, userId, fn)`, which sets `app.tenant_id` for that transaction; every tenant table has a forced RLS policy that compares `tenant_id` to it. Outside `withTenant` the setting is empty and tenant tables return nothing.

## Decisions

- **Drizzle 0.45.4 and drizzle-kit 0.31.11, pinned exactly** (ADR 0011). Schema in `src/schema/`; generated SQL migrations plus hand-written custom migrations in `packages/db/migrations`.
- **First migration (custom):** extensions (`citext`, `pg_trgm`, `vector`), role `orbit_app` (`LOGIN NOSUPERUSER NOBYPASSRLS`), grants plus default privileges for future tables, and `app_current_tenant_id()` / `app_current_user_id()` (`nullif(current_setting(..., true), '')::uuid`, so "not set" is NULL, never an error).
- **`withTenant`** validates both ids as UUIDs, then runs `set_config('app.tenant_id', $1, true)` (the parameterised form of `SET LOCAL`) inside a Drizzle transaction. The setting ends with the transaction.
- **`tenantIsolationSql(table)`** produces `ENABLE` + `FORCE ROW LEVEL SECURITY` and one policy `FOR ALL TO orbit_app` with identical `USING` and `WITH CHECK (tenant_id = (SELECT app_current_tenant_id()))`. The `SELECT` wrapper makes Postgres evaluate it once per statement (skill rule `security-rls-performance`).
- **Week 1 decision honoured:** `tenants`, `users`, `memberships` are platform scope (§11.2, no RLS). Isolation is proven on a test-only `rls_probe` table built with the helper. The first real RLS table arrives with M1-12.
- **Platform tables:** UUIDv7 ids generated in the app, `timestamptz` timestamps, enums as `text` + `CHECK` with values from `packages/shared/src/enums.ts`, case-insensitive unique email (`citext`), one membership per user per workspace, `memberships` indexed by `tenant_id`.
- **`migrate()`** runs as `orbit_admin` and then sets the `orbit_app` password from `DATABASE_URL`, so the password exists only in the environment. It refuses a `DATABASE_URL` that is not `orbit_app`.
- **Rule 1 enforced by lint:** importing `pg` or `drizzle-orm/node-postgres` fails outside `packages/db` and `packages/testing`.
- `pnpm dev` now runs `pnpm db:migrate` after the services start; `pnpm db:seed` adds a demo workspace (refused in production).

## Tests

- **"A query on a tenant table outside `withTenant` returns zero rows"** and **"Inserting a row with another tenant's id inside `withTenant` fails"**: `packages/db/test/tenant-isolation.int.test.ts`, against real Postgres 18 as the real `orbit_app` role. It also covers: only own rows visible, no moving rows across tenants, the setting not leaking after the transaction, the user id exposed, non-UUID input rejected, and the connection role really being `NOBYPASSRLS`.
- **Guard for every future table:** the same file fails if any table with `tenant_id` (other than the platform `memberships`) lacks enabled + forced RLS and a policy.
- `packages/db/test/platform-schema.int.test.ts`: UUIDv7 order, status and role CHECKs, case-insensitive unique email, one membership per user and workspace, migrations re-runnable, wrong role refused, idempotent seed.
- Integration tests use one database per test file (`createTestDatabase`) and one shared test password for the cluster-wide `orbit_app` role.

## Found and fixed along the way (M1-02 follow-ups)

- The local bucket script was not idempotent, so a second `pnpm dev:services` failed. It now accepts an existing bucket, and the dev-stack test starts it twice.
- `docker compose up --wait` treats a finished one-shot container as a failure; the bucket job now has an `init` profile and is run separately.

## Production note

Provision `orbit_admin` with `BYPASSRLS` but not superuser on the production server (M1-06 / runbooks). Migrations run as it before each deploy (§15.4).
