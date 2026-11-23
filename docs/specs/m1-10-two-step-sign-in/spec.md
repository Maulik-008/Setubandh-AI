# M1-10: Optional two-step sign-in

Ticket: M1-10
Status: ready-for-human (implemented 2026-11-23; awaiting your review)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 2](../../plan/01-mvp-1-unified-inbox.md)
Requirements: FR-AUTH-05 (TOTP, 10 recovery codes), §14.3 (TOTP secrets encrypted with AES-256-GCM). Workspace-wide "require 2FA" is M3 (MVP 1 scope table).

## Problem Statement

A stolen password alone should not open an account that holds a business's customer conversations. Users who want more protection need a second step.

## Solution

Any user can turn on an authenticator-app code (TOTP). When it is on, signing in with the right password is not enough: the app then asks for a 6-digit code, or one of 10 single-use recovery codes. The user can turn it off again with their password.

## Decisions

- **Setup:** `POST /v1/me/2fa/setup` creates a new secret (stored encrypted, still disabled) and returns the `otpauth://` URI, the secret for manual entry, and a QR code as an SVG. The QR is generated on the server, so no third-party QR service ever sees the secret.
- **Enable:** `POST /v1/me/2fa/enable { code }` checks a code from the app, turns 2FA on, and returns 10 recovery codes. They are shown once, stored only as hashes, and replace any earlier set.
- **Disable:** `POST /v1/me/2fa/disable { password }` turns 2FA off and deletes the secret and recovery codes. A security event is written.
- **Login when 2FA is on:**
  1. `POST /v1/auth/login` with the right password returns `200 { mfaRequired: true, challengeToken }`. There is no session yet; the challenge is a short-lived (5 min) single-use token.
  2. `POST /v1/auth/login/2fa { challengeToken, code }` or `{ challengeToken, recoveryCode }` issues the session exactly like a normal login.
  3. Wrong codes count towards the same account and IP lockout as wrong passwords (10 in 15 minutes).
- **TOTP rules:** RFC 6238, SHA-1, 6 digits, 30 s period, ±1 step of clock drift (library `otpauth`). The same code cannot be used twice: the last used time step is remembered.
- **Storage:** `users.totp_secret_enc` holds AES-256-GCM ciphertext with `ENCRYPTION_KEY` (random IV, auth tag), in a small `crypto` helper that M1-16 reuses for Meta tokens. `users.totp_enabled`, plus `users.totp_last_step` for replay protection. A new platform table `recovery_codes` (id, user_id, code_hash, used_at) stores codes as SHA-256 hashes; codes are 10 random characters, shown grouped as `xxxxx-xxxxx`.
- Security events: `two_factor_enabled`, `two_factor_disabled`, `recovery_code_used`.

## Tests

- **AC "Login asks for the code when enabled; a recovery code works once":** set up and enable 2FA, then:
  - login with the password returns `mfaRequired` and sets no cookie;
  - the right code issues a session;
  - a recovery code works, and the same recovery code fails the second time.
- More cases: a replayed TOTP code fails; a wrong code counts towards lockout; an expired or reused challenge fails; disabling needs the correct password; the stored secret is not the plain secret (it is ciphertext); a login without 2FA is unchanged.
- **Unit:** encrypt/decrypt round-trip, tampered ciphertext rejected (property-based with fast-check), and recovery code format.

## Out of scope

- Workspace "require 2FA for all members" (M3).
- Mandatory 2FA for platform admins (with admin lite, M1-30).
- The setup screens (M1-13).

## Implementation notes (2026-11-23)

- Acceptance test: `apps/api/test/two-factor.int.test.ts` (7 tests on real Postgres and Valkey). Encryption: `apps/api/test/crypto.test.ts` (property-based).
- The property-based test found a real bug before release: an empty secret sealed to exactly 28 bytes but `open()` required 29. Fixed.
- The login challenge lives in Valkey (5 min) and is consumed by any answer, right or wrong, so every guess needs the password again; wrong codes count toward the 10-in-15-minutes lockout.
- The account lockout counter is cleared only after the full login (both steps) succeeds.
