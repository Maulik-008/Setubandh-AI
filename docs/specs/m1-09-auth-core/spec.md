# M1-09: Auth core

Ticket: M1-09
Status: ready-for-agent (plan approved 2026-11-23)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 2](../../plan/01-mvp-1-unified-inbox.md)
Requirements: FR-AUTH-01..04, FR-AUTH-11, §5.1 (users and memberships), §11.2 (users, memberships, refresh_tokens), §14.3 (security), §12.1 (errors)
Decisions (developer, 2026-11-23): build a minimal mailer and security-event log now (full email service in M1-14, append-only audit in M1-12); breached-password check through the HIBP k-anonymity API with a bundled fallback list; signup creates the first workspace with the user as Owner.

## Problem Statement

Nobody can use the product without an account. Sign-in is also the main attack surface: password guessing, stolen refresh tokens, account enumeration and weak passwords must be handled from the first line of code.

## Solution

Email and password accounts with verified email, short-lived access tokens kept in memory by the app, and rotating refresh tokens in an `httpOnly` cookie. Reusing an old refresh token signs the user out everywhere and records a security event. Repeated failed logins lock the account and the IP for 15 minutes. Password reset by single-use link signs out every session. Unverified users can sign in but cannot connect channels.

## User stories

1. As a business owner, I sign up with my name, email, password and business name, so that I get my own workspace immediately.
2. As a business owner, I receive a verification email valid for 24 hours, so that I can prove the address is mine.
3. As a user, I log in with email and password and stay signed in for up to 30 days on this device.
4. As a user, I see "Email or password is incorrect" whether the email exists or not, so attackers cannot learn who has an account.
5. As a user, after 10 wrong passwords in 15 minutes further attempts are refused for a while, so my account cannot be brute-forced.
6. As a user, if someone steals and replays an old session token, all my sessions end and the event is recorded.
7. As a user, I can reset a forgotten password with a link valid for 1 hour, used once; afterwards every device is signed out.
8. As a user, I cannot choose a password shorter than 10 characters or one known from data breaches.
9. As a user, I can read and update my profile (`GET/PATCH /v1/me`: name, locale, avatar URL).
10. As an unverified user, I am told to verify my email (`EMAIL_NOT_VERIFIED`) when I try to connect a channel.
11. As the operator, I can see security events (reuse detected, lockouts, password resets) for investigation.

## Implementation decisions

**Data** (`packages/db`, platform scope as in §11.2; migrations generated plus reviewed):
- `refresh_tokens`: id, user_id, family_id, token_hash, expires_at, revoked_at, replaced_by, user_agent, ip, created_at. Indexed by `token_hash` (unique) and `(user_id, family_id)`.
- `email_tokens`: id, user_id, purpose (`verify_email`, `reset_password`), token_hash, expires_at, used_at.
- `security_events`: id, user_id null, type, ip, user_agent, metadata jsonb, created_at. Append-only grants and partitioning come with M1-12.
- Signup writes `users`, `tenants` and an `owner` membership in one transaction. The tenant gets the name from the form, a unique slug, status `trialing`, and a time zone sent by the browser (`Intl`, validated as an IANA zone). Country and currency are derived from that time zone through a small map (falls back to `IN` / `INR` / `Asia/Kolkata`); all are editable later in Workspace settings (developer decision, 2026-11-23).

**API module `auth`** (`apps/api/src/modules/auth`): controller, service, repository and focused helpers.
- Endpoints under `/v1/auth`:
  - `POST signup`
  - `POST verify-email`
  - `POST resend-verification`
  - `POST login`
  - `POST refresh`
  - `POST logout`
  - `POST forgot-password`
  - `POST reset-password`
- `GET` and `PATCH /v1/me`.
- Request and response bodies are Zod schemas in `packages/shared` (`auth.ts`). Every route is registered in OpenAPI.
- **Passwords:** argon2id (`@node-rs/argon2`; memory 19 MiB, 2 iterations, parallelism 1, OWASP minimum). Minimum 10 characters, maximum 128.
- **Breached check:** HIBP range API (`api.pwnedpasswords.com/range/<5 hex>`, `Add-Padding: true`, 2 s timeout). If it is unreachable, a bundled list of common breached passwords is checked instead and a warning is logged without the password. HIBP is added to the sub-processor list in the privacy page later (M1-32).
- **Access token:** JWT HS256 signed with `JWT_ACCESS_SECRET` (`jose`), 15 minutes. Claims `sub`, `sid` (family), `ev` (email verified), `iat`, `exp`. The API returns it in the body and the app keeps it in memory.
- **Refresh token:** 32 random bytes, stored as an HMAC-SHA256 with `JWT_REFRESH_SECRET`, 30 days. Cookie `sb_refresh`: `httpOnly`, `Secure` (not in development), `SameSite=Lax`, `Path=/v1/auth`. Each use rotates it, and the old one is marked `replaced_by`.
- **Reuse detection:** presenting a refresh token that was already rotated or revoked revokes the whole family, writes `security_events.type = 'refresh_token_reuse'`, and returns `401 SESSION_REVOKED`. A short grace window (10 s) tolerates two tabs refreshing at the same moment.
- **Lockout:** two Valkey counters, `t:auth:fail:acct:<user>` and `t:auth:fail:ip:<ip>`, each counting failures in a 15-minute window. From the 11th attempt, login is refused with `429 TOO_MANY_ATTEMPTS` and `Retry-After`, even with the right password, and a `login_locked` security event is written once per lock. A successful login clears the account counter.
- **Email verification and reset:** single-use random tokens stored as SHA-256 hashes. Verify links last 24 hours, reset links 1 hour. `forgot-password` and `resend-verification` always answer `202`, so they never reveal whether an account exists. A reset revokes all refresh tokens for the user and writes `password_reset`.
- **Signup with an existing email** also answers `202` ("check your inbox") and emails the owner of that address instead, so signup cannot be used to discover accounts.
- **Guards:** a global `AuthGuard` reads the bearer token, and `@Public()` marks open routes. `@RequireVerifiedEmail()` returns `403 EMAIL_NOT_VERIFIED`; channel connect (M1-16) will use it. Until then, the acceptance test uses a probe route. `@RequirePermission` and the workspace guard arrive with M1-11; `/v1/me` is user-scoped, not workspace-scoped.
- **Mailer (minimal):** `MailerService` over SMTP (`nodemailer`), plain text plus simple HTML for verify and reset. Mailpit catches it locally. Templates and the full email service come in M1-14. Links point to `APP_URL`.
- **Rate limiting:** per IP on `/v1/auth/*` (e.g. 30 requests a minute) via a Valkey counter, as §14.3 requires for auth endpoints.
- New error codes in `packages/shared`: `INVALID_CREDENTIALS` (401), `SESSION_REVOKED` (401), `TOKEN_INVALID` (400), `TOO_MANY_ATTEMPTS` (429), `EMAIL_NOT_VERIFIED` (403), `PASSWORD_REJECTED` (422 with reason).

**Delivery:** the ticket is well over ~600 lines, so it ships as two commits:
1. M1-09a: signup, verify, login, refresh, logout, lockout, guards.
2. M1-09b: forgot/reset, breached check, `/me`, mailer polish.

## Testing decisions

Integration tests run the real API (`createTestApp` + `configureApp`) against Postgres and Valkey containers, with Mailpit-like capture through a fake mailer provider. Emails are read from the captured outbox to follow links.

| Acceptance criterion | Test |
|---|---|
| Reused refresh token revokes the family and writes a security audit entry | Log in, refresh once, replay the first token, then: `401 SESSION_REVOKED`, the new token from the same family no longer works, and a `refresh_token_reuse` row exists |
| 11th failed login in 15 minutes is rejected for that account and IP | 10 wrong passwords, then the 11th with the **right** password gets `429 TOO_MANY_ATTEMPTS`. A different account from the same IP is also refused; the same account from another IP is also refused. A fake clock moving past 15 minutes allows login again |
| Reset revokes all sessions | Two sessions, reset via the emailed link, then both refresh tokens fail and the old password fails |
| Unverified user gets `EMAIL_NOT_VERIFIED` when trying to connect a channel | A probe route with `@RequireVerifiedEmail()`: unverified gets `403 EMAIL_NOT_VERIFIED`; after following the verify link, 200 |

Further tests:
- Unit tests: password rules, the HIBP client (fake server, padding header, timeout falls back to the local list), token hashing, cookie attributes.
- Integration tests: signup creates the workspace and Owner membership; duplicate signup answers 202 and emails the owner; generic login error; verify link single-use and expiry; `/v1/me` read and update; no passwords, tokens or cookies in logs (reuses the M1-03 log capture).
- Property-based test (fast-check): token hashing and verification round-trip.

## Out of scope

- TOTP 2FA (M1-10).
- Workspace switcher, invitations, roles, `@RequirePermission`, `X-Workspace-Id` (M1-11).
- Append-only audit grants and the isolation suite (M1-12).
- Auth screens (M1-13).
- Email templates and file storage (M1-14).
- Sessions list (P1).
- Google login (M6).
