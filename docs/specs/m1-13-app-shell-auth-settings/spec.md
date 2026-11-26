# M1-13: App shell, auth screens, settings shell

Ticket: M1-13
Status: ready-for-agent (plan approved 2026-11-26)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §4.1, §9 week 2](../../plan/01-mvp-1-unified-inbox.md)
Requirements:
- §13.2 frontend patterns
- §13.3.3 Paper & Pastel rules
- §13.4 shell and routes
- P1-06 (shell passes `audit.py` and axe in both modes at 375 and 1280)

Also brings in the screens that M1-10 (2FA setup) and M1-11 (switcher, members) left for this ticket.

## Problem Statement

The API can sign people up, sign them in, and manage workspaces and members, but nobody can use any of it: the web app is still the design-system page. Owners need to sign up, sign in, switch workspaces, invite their team and adjust settings in a real interface that works on a phone and a laptop, in light and dark mode, with a keyboard and a screen reader.

## Solution

The tenant web app gets:
- real routing;
- the auth screens;
- the app shell (sidebar with workspace switcher, top bar, mobile pill row);
- the Settings area with working Workspace, Members and Profile tabs.

The Channels and Saved replies tabs, Home and Inbox have their URLs and designed empty states now; their content arrives with their tickets (M1-16, M1-21, M1-28, M1-20). The design-system page moves to `/dev/design-system`, available only in development builds.

## Decisions

**Libraries (all from §13.2, exact versions pinned):**
- React Router v7 (data router, route-level code splitting);
- TanStack Query v5 (keys `[workspaceId, resource, params]`);
- react-hook-form with the Zod resolver, reusing the `@setubandh/shared` schemas;
- i18next with react-i18next: every string lives in `src/i18n/en.json` from day one;
- Zustand is not added yet (nothing needs UI-only state).

**Auth client (`src/api/`):**
- A `fetch` wrapper adds the access token and `X-Workspace-Id`, and turns the §12.1 error shape into an `ApiError` with `code` and a plain-language message.
- The access token is kept in memory only. On load and on a `401`, the client calls `POST /v1/auth/refresh` once through the cookie, and concurrent callers share that single refresh. If the refresh fails, the user is signed out and sent to `/login?next=…`.
- In development, Vite proxies `/v1` to the API, so the refresh cookie stays first-party.

**Routes** (every screen and every tab has a URL; browser back works):

| Area | Routes |
|---|---|
| Auth (public) | `/login`, `/signup`, `/verify?token=`, `/forgot`, `/reset?token=`, `/invite?token=`, `/2fa` (second step after login) |
| App (signed in) | `/` Home, `/inbox`, `/settings/workspace`, `/settings/members`, `/settings/channels`, `/settings/saved-replies`, `/settings/profile` (`/settings` redirects to `/settings/workspace`) |
| Other | `*` 404 page; error boundary per route with **Try again** |

- **Email links:** the API currently sends `/verify-email?token=`, `/reset-password?token=` and `/accept-invite?token=`. These change to the routes above. The tokens stay in the query string (as in §13.4, except that `/invite/:token` becomes `/invite?token=`), so a token never ends up in a path segment. Auth pages also send `Referrer-Policy: no-referrer` (Caddy and Vite).
- **Signed-in guard:** without a session, `/…` redirects to `/login?next=…`; signed in, `/login` redirects to `/`.
- **Active workspace:** taken from the API's `lastWorkspaceId`, or else the first workspace. Switching calls `PUT /v1/me/last-workspace` and resets the query cache. A user with no workspace sees a "Create your workspace" screen.

**Auth screens:**
- **Login:** shows the generic error, a `429` with its wait time, and the 2FA step (6-digit code, or "Use a recovery code").
- **Signup:** sends the browser time zone, then shows "Check your inbox".
- **Verify:** handles success, expired and used links, and offers resend.
- **Forgot** and **Reset:** reset shows the password rules and the breached-password message.
- **Invite:** a signed-out new person gets name and password fields. A signed-in user whose email matches gets **Join workspace**. A mismatch gets "Sign in as the invited email".

**Shell** (§13.4; the prototype is the layout reference):
- Sidebar at 244 px, using Astryx navigation components with Paper & Pastel pills:
  - workspace switcher at the top (list, role, **Create workspace** within the cap of 3);
  - nav: Home, Inbox, Settings;
  - "Channels" list with an empty state linking to Settings › Channels.
- Top bar at 60 px:
  - notifications bell (placeholder popover: "No notifications yet");
  - `ColorModeToggle`;
  - profile menu: name and email, availability (Online / Away / Offline), Profile, Sign out.
- Below `lg`, the sidebar becomes a horizontally scrollable pill row (no hamburger-only navigation).
- An "Unverified email" banner with **Resend link** appears until the email is verified.
- **Availability** needs a small API addition: `PATCH /v1/members/me { availability }` (any member, `@RequirePermission()`), with a test.

**Settings:**
- **Workspace** (`workspace.settings`):
  - name and time zone (searchable select of IANA zones);
  - "Agents can see all conversations" switch;
  - country and currency shown read-only (no edit API in MVP 1).
- **Members:**
  - member table with role and joined date;
  - invite dialog (email and role);
  - change role and remove, each with a confirm dialog;
  - pending invitations with resend and revoke;
  - **Transfer ownership** (Owner only).
  - Rows and actions follow the M1-11 rules. `<Can permission>` and `useCan()` hide actions the role lacks; the API still decides.
- **Profile:**
  - name and locale;
  - two-step sign-in: set up (QR SVG from the API, manual secret, confirm code, recovery codes shown once with Copy and Download) and turn off (password).
- **Channels:** empty state "No channels yet". The ink button **Connect WhatsApp** is disabled with the note "Arrives with channel connection" until M1-16, and unverified users see why they cannot connect.
- **Saved replies:** empty state only (content in M1-21).
- **Home** and **Inbox:** page title plus a designed empty state (content in M1-28 and M1-20).

**Design rules** (paper-pastel-studio skill, ADR 0012):
- Astryx components first, one ink CTA per view, tokens only, Lucide at 1.75 through `LineIcon`, Geist.
- Every state is designed: loading skeletons, empty, error with retry, and success toasts.
- WCAG 2.2 AA:
  - focus visible;
  - labels on every input;
  - errors linked with `aria-describedby`;
  - target size at least 24 px;
  - `prefers-reduced-motion` respected.

**Delivery:** well over ~600 lines, so three commits:
1. M1-13a: app foundations (router, API client, i18n, auth screens) plus the link path changes in the API.
2. M1-13b: the shell, the switcher, availability.
3. M1-13c: Settings tabs.

## Tests

| AC | Test |
|---|---|
| `audit.py` and axe clean in both modes at 375 and 1280 | E2E (`apps/web/e2e`): every route rendered with a mocked API in light and dark at 375 × 812 and 1280 × 800, `expectAccessible()` on each (0 serious or critical). `pnpm ui:audit` passes with 0 errors in CI. |
| Every screen has a URL; browser back works | E2E: visits every route in the table directly (deep link), navigates through the sidebar and the settings tabs, then checks that `page.goBack()` restores the previous URL and heading. |

Also covered:
- **Browser component tests** (Vitest browser mode with MSW):
  - the login error, lockout and 2FA paths;
  - signup "check your inbox";
  - silent refresh on `401` (one refresh for parallel calls) and sign-out when refresh fails;
  - the guard redirect with `next`;
  - the switcher sending `X-Workspace-Id`;
  - `<Can>` hiding actions for an Agent;
  - the members invite, role change and remove dialogs;
  - the 2FA setup flow.
- **One end-to-end smoke** against the real API and Postgres (Playwright with the compose stack): sign up, follow the verify link from Mailpit, log in, invite a member, switch workspace.
- **Screenshots:** login, Home shell and Settings › Members in both modes (CI-owned baselines via **refresh-screenshots**).

## Out of scope

- Onboarding stepper (`/setup/*`).
- Command palette.
- AI status chip and usage card (MVP 2 and billing).
- Inbox, Home and channel content.
- Change password while signed in (not in FR-AUTH for MVP 1).
- Admin app screens (M1-30).
- Hindi UI (P1).
