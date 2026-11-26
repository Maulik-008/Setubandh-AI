# @setubandh/db

Drizzle schema, migrations, row-level security (RLS) and the only database clients in the repo (rule 1).

## Using it

```ts
const db = createDatabase(env.DATABASE_URL); // orbit_app, cannot bypass RLS

// Tenant data: always inside withTenant (sets app.tenant_id / app.user_id for this transaction).
const rows = await db.withTenant(tenantId, userId, (tx) => tx.select().from(conversations));

// Platform tables (tenants, users, memberships; requirements §11.2) only.
const user = await db.platform.query.users.findFirst({ where: eq(users.email, email) });
```

A tenant table queried outside `withTenant` returns **no rows**; writing another tenant's id fails.

## Adding a tenant table (every ticket that creates one)

1. Add the table to `src/schema/` with `tenant_id uuid not null references tenants(id)` and an index that starts with `tenant_id`.
2. `pnpm --filter @setubandh/db db:generate` creates the SQL migration.
3. `pnpm --filter @setubandh/db exec drizzle-kit generate --custom --name=<table>_rls` and paste the output of `tenantIsolationSql('<table>')` (enable + FORCE RLS, one policy with USING and WITH CHECK).
4. Add a seed row for the table to `SEED_ROW` in `test/tenant-isolation.int.test.ts`. The isolation suite finds every table with `tenant_id` by itself and fails, naming the table, when RLS, FORCE, the policy, the `tenant_id` index or the seed row is missing.
5. If the ticket adds workspace endpoints with path ids, add them to `CROSS_TENANT_FIXTURES` in `apps/api/test/isolation.int.test.ts` (the suite asks for it by name).

Run `/rls-check` before opening the PR. Only the platform-scope modules (`auth`, `users`, `tenancy`, `audit`, worker `platform`, later `platform-admin` and `billing`) may use `db.platform`; anywhere else it is a lint error.

## Audit logs (M1-12)

- `audit_logs` (tenant, RLS) and `platform_audit_logs` (platform) come from the hand-written migration `0005_audit_logs.sql`: drizzle-kit cannot express partitioned tables, so `src/schema/audit.ts` only describes them for queries and is left out of `drizzle.config.ts`.
- **Append-only:** `orbit_app` has `SELECT, INSERT` only; `UPDATE`, `DELETE` and `TRUNCATE` are refused (also on `security_events`).
- **Monthly partitions** on `created_at`, plus a `DEFAULT` partition. Partitions have no grants for `orbit_app` and are reachable only through the parent. `app_ensure_audit_partitions(months_ahead)` creates missing months; the worker runs it at boot and daily at 02:17 UTC (`platform.audit-partitions`), keeping 3 months ahead.
- Write them through `AuditService` / `PlatformAuditService` (`apps/api/src/modules/audit`), never directly. Action names live in `packages/shared/src/audit.ts`.

## Commands

| Command | What |
|---|---|
| `pnpm db:migrate` | Apply migrations as `orbit_admin` (`DATABASE_ADMIN_URL`), create `orbit_app`, set its password from `DATABASE_URL`. Idempotent; `pnpm dev` runs it. |
| `pnpm db:seed` | Local demo workspace (refuses in production). |
| `pnpm --filter @setubandh/db db:generate` | SQL migration from schema changes. |

## Roles

- `orbit_app`: `LOGIN NOSUPERUSER NOBYPASSRLS`. Created by the first migration; used by api and worker.
- `orbit_admin`: owns the schema and runs migrations. Locally it is the container superuser. In production, provision it with `BYPASSRLS` (not superuser); it is used only by migrations, `platform-admin` and `billing`, and every use is audited (requirements §5.2).
