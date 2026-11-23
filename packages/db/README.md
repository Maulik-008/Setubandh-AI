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
4. Add the table to the tenant isolation tests. The guard test in `test/tenant-isolation.int.test.ts` already fails if any table with `tenant_id` lacks forced RLS or a policy.

Run `/rls-check` before opening the PR.

## Commands

| Command | What |
|---|---|
| `pnpm db:migrate` | Apply migrations as `orbit_admin` (`DATABASE_ADMIN_URL`), create `orbit_app`, set its password from `DATABASE_URL`. Idempotent; `pnpm dev` runs it. |
| `pnpm db:seed` | Local demo workspace (refuses in production). |
| `pnpm --filter @setubandh/db db:generate` | SQL migration from schema changes. |

## Roles

- `orbit_app`: `LOGIN NOSUPERUSER NOBYPASSRLS`. Created by the first migration; used by api and worker.
- `orbit_admin`: owns the schema and runs migrations. Locally it is the container superuser. In production, provision it with `BYPASSRLS` (not superuser); it is used only by migrations, `platform-admin` and `billing`, and every use is audited (requirements §5.2).
