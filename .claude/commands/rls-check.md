---
description: Scan the current diff for tenant-isolation gaps (missing tenant_id, RLS, withTenant).
---

Review the current git diff (staged and unstaged) against the tenant-isolation rules in `CLAUDE.md` rule 1 and `docs/requirements.md` §5.2.

Check and report each as pass / fail with file and line:

1. Every new tenant-owned table has `tenant_id uuid not null`, an index starting with `tenant_id`, an RLS policy with both `USING` and `WITH CHECK`, and `FORCE ROW LEVEL SECURITY`.
2. Every tenant query goes through `db.withTenant(...)`; no raw pool or admin-role use outside `packages/db`, `platform-admin`, `billing` and the migration runner.
3. Every BullMQ job payload carries `tenantId` (or is named `platform.*`).
4. Redis keys use the `t:{tenantId}:` prefix; object-storage keys use `tenants/{tenantId}/`.
5. The tenant comes from `X-Workspace-Id` validated by `TenantGuard`, never from the request body.
6. New tables or endpoints have a test in the tenant isolation suite.
7. Logs add no message bodies, tokens or PII.

Report findings only; do not edit code. If the diff has no relevant changes, say so.
