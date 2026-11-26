# M1-12: Tenant isolation suite and audit log

Ticket: M1-12
Status: ready-for-human (implemented 2026-11-26; awaiting your review)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 2](../../plan/01-mvp-1-unified-inbox.md)
Requirements: §5.2 (automated isolation proof, P1-04), FR-AUD-01..03 and P1-05 (audit log, append-only), §11.2 (`audit_logs`, `platform_audit_logs`, monthly partitions), §14.6 (logs).

## Problem Statement

Two promises need hard proof before any customer data arrives. First, one business can never see another business's data, even when a developer forgets a check. Second, the record of who did what (member changes, settings changes, later channel connects and AI changes) cannot be edited or deleted by the app, even if the app is compromised.

## Solution

A tenant audit log and a platform audit log that the app role can only append to and read. And an isolation suite that, without hand-written cases, walks every workspace endpoint and every tenant table and fails when one of them leaks across workspaces. New endpoints and tables are covered the moment they exist, or the suite fails and says what is missing.

## Decisions

**Audit tables** (migration 0005):
- `audit_logs` (tenant scope): id, tenant_id, actor_type (`user`, `ai`, `system`, `platform_admin`), actor_id, action, target_type, target_id, metadata jsonb, ip, created_at.
  - RLS through `tenantIsolationSql`.
  - Partitioned by month on `created_at`, so the primary key is `(id, created_at)`.
  - Index on `(tenant_id, created_at desc)`.
- `platform_audit_logs` (platform scope): id, admin_id, tenant_id null, action, target_type, target_id, before jsonb, after jsonb, reason, ip, created_at, also partitioned by month.
  - `admin_id` gets no foreign key yet: the platform admins table comes with admin lite (M1-30), which adds it.
- **Append-only:** `orbit_app` gets `SELECT, INSERT` only on both parents, and `UPDATE`, `DELETE` and `TRUNCATE` are revoked. Partitions get no grants at all, so they can only be reached through the parent, where RLS and the grants apply.
- **Partitions:** a `SECURITY DEFINER` function `app_ensure_audit_partitions(months_ahead int)` creates missing monthly partitions and revokes every grant on them.
  - The migration creates them from the current month through 3 months ahead.
  - A worker job (`platform.audit-partitions`, daily, BullMQ repeatable) keeps 3 months ahead.
  - A `DEFAULT` partition catches anything outside the range, so an insert never fails.
- `security_events` (account-level: logins, lockouts, resets, 2FA) stays as it is and becomes append-only too (same grants).

**Services** (`apps/api/src/modules/audit`, exported through its `index.ts`):
- `AuditService.record({ tenantId, actor, action, target, metadata, ip })` writes through `db.withTenant`.
- `PlatformAuditService.record(...)` writes platform rows. Its first callers come with M1-30; until then it is covered by tests.
- Actions are a typed list in `packages/shared` (`AUDIT_ACTIONS`) and are named `area.verb`: `member.invited`, `member.role_changed`, `member.removed`, `workspace.ownership_transferred`, `workspace.settings_changed`, `invitation.accepted`, `invitation.revoked`.
- **Moves from M1-11:** the four member events now go to `audit_logs` instead of `security_events`, as the M1-11 spec said.
- Message bodies and secrets are never put in `metadata` (rule 7). Settings changes record field names, plus the old and new values of non-secret fields only.
- No read endpoint or screen: the audit log UI is P1 (FR-AUD-01). Tests read the rows.

**Isolation suite** (`apps/api/test/isolation.int.test.ts`, runs in the integration job, so on every push and pull request):
1. **Every workspace route, found automatically** through `describeRouteAccess`.
   - Tenant B's Owner calls each route with `X-Workspace-Id: A` and must get `403 WORKSPACE_NOT_MEMBER`.
   - Each route with a path id is also called in B's own workspace with an id that belongs to A, and must not answer 2xx.
   - Path ids come from a fixture table keyed by parameter name. A route whose parameter has no fixture fails the suite with "add a fixture for :param".
2. **Every tenant table, found automatically** from the catalog (tables with `tenant_id`, minus the platform allowlist).
   - Each must have RLS enabled and forced.
   - Each must have a policy whose USING and WITH CHECK both compare `tenant_id` with `app_current_tenant_id()`.
   - Each must have an index starting with `tenant_id`.
   - The suite then seeds one row per table for A, reads as B through `withTenant` and expects zero rows, and tries to insert a row for A while scoped to B and expects a refusal.
   - Seeding uses a small per-table fixture map, so a new table without a fixture fails the suite.
3. **Append-only:** as `orbit_app`, update, delete and truncate on `audit_logs`, `platform_audit_logs` and `security_events` are refused, including directly on a partition.

**Lint rule (raw pool):** existing rules already forbid importing `pg` and `drizzle-orm/node-postgres` outside `packages/db` and `packages/testing`. New: `db.platform` may only be used in the modules that §11.2 gives platform tables (`auth`, `users`, `tenancy`, `audit`, and later `platform-admin`, `billing`). Anywhere else is a lint error, with a message pointing to `withTenant`. A fixture test proves the rule fires.

## Tests (acceptance criteria)

| AC | Test |
|---|---|
| Suite runs in CI on every merge and fails if a new tenant table lacks RLS | The suite is in the integration job (already on every push and pull request). A test creates a throwaway `tenant_id` table without RLS in its own database and asserts the table check reports it. |
| Update / delete on audit tables is denied for `orbit_app` | Append-only checks above: error code `42501` for update, delete and truncate on the parents and on a partition. |

Also covered:
- member events land in `audit_logs` with actor and target;
- partitions exist three months ahead, and the worker job is idempotent;
- the lint rule fixture.

## Out of scope

- Audit log screen and CSV export (P1 / M3).
- Platform admins and impersonation (M1-30).
- Retention: dropping partitions after 2 years comes with backups and ops (M1-34).

## Implementation notes (2026-11-26)

- **Acceptance tests:**
  - `packages/db/test/audit.int.test.ts` (append-only, RLS, partitions, the maintenance function);
  - `packages/db/test/tenant-isolation.int.test.ts` (catalog check of every tenant table, cross-tenant reads, "the guard fails when a new tenant table lacks RLS");
  - `apps/api/test/isolation.int.test.ts` (every workspace route).
- **Where the table checks live:** they are in the database package's suite rather than the API suite, next to the RLS tests they extend. The API suite covers the endpoints.
- **Mutation-checked:** dropping the tenant condition from one repository query makes the API suite fail (`PATCH /v1/members/:id` answered 204 across tenants).
- **Readable endpoints:** the suite also checks that no list endpoint called in workspace B returns any identifier of workspace A (ids, emails).
- **Partition job:** the worker now has a database connection. `platform.audit-partitions` runs at boot (job id `platform.audit-partitions.boot`) and on a BullMQ job scheduler. Concurrent runs are serialised by an advisory lock.
- **Security event types:** the four M1-11 member event types are removed from the `security_events` CHECK (migration 0006); those events now go to `audit_logs`.
- **Lint rule:** `platformScopeConfig` in `packages/config/eslint`, with a fixture test. The worker's `platform` module is also allowed, because maintenance jobs are platform scope.
- **Out of this ticket, fixed on the way:** the CI web and admin images failed on `pnpm install --offline` (the supply-chain check needs registry metadata). This was fixed in a separate commit.
