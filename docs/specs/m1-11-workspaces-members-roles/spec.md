# M1-11: Workspaces, members, invitations, roles

Ticket: M1-11
Status: ready-for-human (implemented 2026-11-23; awaiting your review)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §3 and §9, week 2](../../plan/01-mvp-1-unified-inbox.md)
Requirements: FR-AUTH-06, FR-AUTH-07, §5.1–5.2 (tenant from `X-Workspace-Id`, checked against membership on every request), §6 (permissions), §11.2 (memberships, invitations)

## Problem Statement

A business is a team: owners invite staff, give them roles, and remove them when they leave. People who work for two businesses need to switch between them without ever seeing the other business's data. Every API call must be checked against the caller's role in the workspace they are acting in.

## Solution

Workspaces with three MVP 1 roles (Owner, Admin, Agent). Members are invited by email. Every workspace request names its workspace in `X-Workspace-Id`; the server checks membership and role permissions on every request, so a removed member loses access on their very next call. Permissions are constants shared by the API and the UI.

## Decisions

**Permissions.** `packages/shared/src/permissions.ts` lists the §3 permissions and maps roles to permission sets (Manager and Viewer added in M3 without schema changes):

| Permission | Owner | Admin | Agent |
|---|:-:|:-:|:-:|
| `inbox.view_all` | ✓ | ✓ | only with the workspace setting |
| `inbox.view_unassigned`, `inbox.reply`, `inbox.resolve`, `contacts.edit`, `saved_replies.manage_own`, `inbox.assign_self` | ✓ | ✓ | ✓ |
| `inbox.assign_any`, `saved_replies.manage_shared` | ✓ | ✓ | |
| `channels.manage` | ✓ | ✓ | |
| `members.manage` | ✓ | ✓ (never the Owner) | |
| `workspace.settings` | ✓ | ✓ | |
| `workspace.transfer_ownership` | ✓ | | |

**Guards.**
- **`TenantGuard`:** for every route that is not `@Public()` or `@UserScoped()`, read `X-Workspace-Id`. A missing or malformed header gets `400 WORKSPACE_REQUIRED`. The guard then loads the caller's active membership (one indexed query, no cache, so removal takes effect immediately); none means `403 WORKSPACE_NOT_MEMBER`. It sets `request.tenantId`, which also lands in every log line (§14.6), and `request.membership`.
- **`@RequirePermission(...perms)`:** `403 FORBIDDEN` with `details.permission` when the role lacks one.
- **Rule 3 guard test:** a test walks every registered route and fails if one has none of `@Public()`, `@UserScoped()` or `@RequirePermission()`. Auth routes are `@Public()`; `/v1/me`, `/v1/workspaces` and invitation acceptance are `@UserScoped()`.

**Endpoints.**
- `GET /v1/workspaces` lists my workspaces with my role and returns `lastWorkspaceId`.
- `POST /v1/workspaces` creates a workspace; I become its Owner. A user may own at most **3** workspaces (owned only; invitations to other workspaces are unlimited, developer decision), else `409 WORKSPACE_LIMIT_REACHED`.
- `GET` / `PATCH /v1/workspace` reads or updates the current workspace: name, time zone, "Agents can see all conversations" (default off). Requires `workspace.settings` to update.
- `PUT /v1/me/last-workspace { workspaceId }` remembers the switcher choice (FR-AUTH-07). The workspace must be one of mine.
- Members:
  - `GET /v1/members` lists the workspace's members (any member may read).
  - `PATCH /v1/members/:id { role }` changes a role.
  - `DELETE /v1/members/:id` removes a member.

  Changing roles and removing members need `members.manage`. An Admin can never change or remove the Owner or make someone Owner, and nobody can remove the Owner (transfer first).
- `POST /v1/workspace/transfer-ownership { memberId }`: Owner only. The new Owner must be an active member; the old Owner becomes Admin.
- Invitations:
  - `POST /v1/invitations { email, role: admin | agent }` creates an invite valid for 7 days; the email contains a single-use token link.
  - `GET /v1/invitations` lists pending invites.
  - `POST /v1/invitations/:id/resend` sends a new token and resets the 7 days.
  - `DELETE /v1/invitations/:id` revokes. Managing invites needs `members.manage`.
- Accepting an invite (FR-AUTH-06):
  - `POST /v1/invitations/accept { token }` is `@UserScoped()` for a signed-in user whose email matches the invite.
  - `POST /v1/auth/accept-invite { token, name, password }` is `@Public()` and creates the account when none exists. The email counts as verified, because the link proved it; the response is a session like login.
  - Either way the membership is created and the invite marked accepted. A wrong email, an expired or already used token: `400 INVITATION_INVALID`.

**Data (platform scope, §11.2).**
- `invitations`: id, tenant_id, email (citext), role, token_hash, expires_at, invited_by, accepted_at, revoked_at.
- `tenants.agents_see_all_conversations` (boolean, default false).
- `users.last_tenant_id`.
- Owner uniqueness: a partial unique index, one `owner` per tenant.
- Security events: `member_invited`, `member_role_changed`, `member_removed`, `ownership_transferred`. These go to `security_events` until the M1-12 audit log replaces them.

**New error codes:** `WORKSPACE_REQUIRED` (400), `WORKSPACE_NOT_MEMBER` (403), `WORKSPACE_LIMIT_REACHED` (409), `INVITATION_INVALID` (400).

## Tests

- **AC "each role can call exactly the endpoints in §3":** one table of every workspace endpoint × Owner / Admin / Agent, with the expected allowed or forbidden result, run as integration tests against real Postgres.
- **AC "removed member loses access immediately":** a member is removed, and their next request (same access token) gets `403 WORKSPACE_NOT_MEMBER`.
- **AC "a user in two workspaces only sees data of the active one":** a user in workspaces A and B lists members with `X-Workspace-Id: A` and sees only A's members, then B's only with B. A workspace the user does not belong to gets `WORKSPACE_NOT_MEMBER`.
- More cases:
  - the Admin cannot touch the Owner;
  - the Owner cannot be removed;
  - ownership transfer swaps roles;
  - the 3-workspace cap;
  - the invite flows (existing user, new user, wrong email, expired, revoked, resent);
  - the agent-visibility setting toggles `inbox.view_all` in the effective permissions;
  - the "every route declares a permission" guard test.

## Out of scope

- Manager and Viewer roles, custom roles (M3 / M6).
- Workspace deletion (M3).
- Workspace "require 2FA" (M3).
- The switcher and members screens (M1-13).
- The tenant isolation suite and append-only audit (M1-12).
- Email templates (M1-14).

## Implementation notes (2026-11-23)

- Code: `apps/api/src/modules/tenancy` (TenantGuard, workspaces, members, invitations); access decorators `@Public` / `@UserScoped` / `@RequirePermission` in `apps/api/src/core/access.ts`; permissions in `packages/shared/src/permissions.ts`; migration `0004_workspaces_invitations.sql`.
- Acceptance tests: `apps/api/test/workspaces.int.test.ts` (37 tests on real Postgres and Valkey; the role table alone is 9 endpoints × 3 roles). Rule 3 guard: `apps/api/test/route-permissions.test.ts`, checked by removing a decorator and watching it fail.
- `@RequirePermission()` with no arguments means "any member of this workspace". A route with no declaration at all is treated as a workspace route (fail closed), and the guard test forbids it anyway.
- Changing the Owner's role or removing the Owner: an Admin gets `403 FORBIDDEN`; the Owner gets `409 CONFLICT` ("transfer ownership first").
- Inviting someone who is already a member gets `409 CONFLICT`. A new invite to the same email replaces the open one.
- `POST /v1/auth/accept-invite` for an email that already has an account gets `400 INVITATION_INVALID` with "sign in to accept".
- `invitations` stays in platform scope like `memberships` (no RLS), as decided above. It is added to the allowlist in the database isolation guard test with that reason.
- Two test-infrastructure races surfaced while running the suites in parallel, and both are fixed:
  - concurrent `ALTER ROLE orbit_app` in `migrate()` now retries;
  - `TestDatabase.drop()` now waits for closing connections before falling back to `FORCE`.
