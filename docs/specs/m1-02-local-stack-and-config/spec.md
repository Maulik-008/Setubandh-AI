# M1-02: Local stack and typed config

Ticket: M1-02
Status: ready-for-human (implemented 2026-11-23; awaiting your review)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 1](../../plan/01-mvp-1-unified-inbox.md)
Requirements: §15.3 (environments), §15.6 (configuration), §5.2 (Redis key and file prefixes, for later)
Decisions: [ADR 0011](../../adr/0011-backend-stack-refresh.md); week 1 decisions in the plan file

## Problem Statement

The developer cannot run anything locally yet. There are no database, queue store, object storage or email catcher on the machine, and no single command to start them with the apps. Configuration is only a list of names in `.env.example`. A missing or mistyped variable would surface as a confusing crash deep inside some module, possibly in production.

## Solution

`pnpm dev` starts the local services in Docker (Postgres 18 with pgvector, Valkey 8.1, a SeaweedFS S3-compatible store with a ready bucket, Mailpit), waits until they are healthy, and then starts the API, the worker and both web apps. A server-only config package reads `.env`, checks every variable from §15.6 with Zod, and refuses to start an app if any is missing or malformed. The message names each bad variable and says how to fix it. `pnpm env:init` creates a working local `.env` with safe placeholders, so a fresh clone runs in two commands.

## User Stories

1. As the developer, I want `pnpm env:init` to create `.env` from `.env.example` with local defaults, so that I don't fill in 40 variables by hand.
2. As the developer, I want `env:init` to generate random local secrets (JWT, encryption key), so that no shared secret is copied between machines.
3. As the developer, I want `env:init` to refuse to overwrite an existing `.env`, so that I never lose my real values.
4. As the developer, I want `pnpm dev` to start all local services and wait until they are healthy before starting the apps, so that apps don't crash on a database that is still booting.
5. As the developer, I want `pnpm dev` to start the API, worker, web and admin apps with live reload, so that I see changes immediately.
6. As the developer, I want Postgres 18 with the pgvector extension available, so that the MVP 2 knowledge base can use it without changing the stack.
7. As the developer, I want Valkey configured like production (append-only persistence on, no eviction), so that queue behaviour matches.
8. As the developer, I want an S3-compatible store with the app's bucket already created, so that file uploads work locally with the same code as R2 in production.
9. As the developer, I want every email the app sends caught by Mailpit with a web inbox, so that I can check invitation and reset emails without a real mail server.
10. As the developer, I want service data kept in named Docker volumes, so that restarting the stack keeps my local data. I also want a documented command to wipe it.
11. As the developer, I want an app to stop at boot with a message naming each missing or invalid variable, so that I fix configuration in seconds.
12. As the developer, I want the boot message never to print a secret value, so that terminals and logs stay safe (rule 7).
13. As the developer, I want URLs, ports and enums (for example `NODE_ENV`) checked for format, not only presence, so that typos are caught at boot.
14. As the developer, I want typed access to configuration in code (no `process.env` reads outside the config package), so that names are checked by TypeScript.
15. As the developer, I want a lint rule that stops the web and admin apps from importing the server config package, so that secrets can never reach a browser bundle.
16. As the developer, I want a test that fails when `.env.example` and the config schema disagree, so that the template never drifts.
17. As the developer, I want `.env.example` to document every variable with a one-line comment, so that a new teammate knows what each one is.
18. As the developer, I want the README to explain the two-command setup and the service URLs (Mailpit inbox, S3 endpoint), so that onboarding needs no help.

## Implementation Decisions

- **New package `@setubandh/env`** (server-only).
  - It exports `loadEnv()`, which returns a frozen, typed config object, and the Zod schema.
  - It reads `.env` from the repo root with Node's built-in `process.loadEnvFile`; real environment variables take precedence over the file.
  - Nothing else in the code reads `process.env`, except tooling config files.
- **Validation:** every variable in requirements §15.6 must be present.
  - Formats checked: URLs (`*_URL`, `S3_ENDPOINT`), Postgres and Redis connection strings, integer port, `NODE_ENV` in `development | test | production`, a base64 encryption key that decodes to 32 bytes, and JWT secrets of at least 32 characters.
  - `SMTP_USER`, `SMTP_PASS` and `SENTRY_DSN` must be set but may be empty (empty means "no auth" or "Sentry off"), because Mailpit needs no login. This is the only exception to "required" (confirmed by the developer).
- **Boot failure:** apps call `loadEnv()` first. On failure the process prints one line per problem, for example `Missing environment variable: META_APP_ID (see .env.example)` or `Invalid environment variable: REDIS_URL must be a redis:// URL`, and exits with code 1. Values are never printed.
- **`pnpm env:init`** (a Node script in `scripts/`) copies `.env.example` and fills local defaults:
  - service URLs matching the compose file;
  - `orbit_app` / `orbit_admin` connection strings, ready for M1-04;
  - random JWT secrets and encryption key;
  - Meta, Anthropic, Razorpay and Stripe placeholders such as `local-placeholder`.

  It refuses to run if `.env` exists, unless passed `--force`.
- **Compose file** `infra/docker/docker-compose.dev.yml` (layout from §4.5), with services pinned by tag and a healthcheck each:
  - `pgvector/pgvector:pg18`: database `setubandh`; superuser `orbit_admin` for local use. M1-04 creates `orbit_app` and tightens roles through migrations.
  - `valkey/valkey:8.1`: `appendonly yes`, `maxmemory-policy noeviction`.
  - `chrislusf/seaweedfs`, pinned to the current release: S3 gateway with dev access keys from `.env`, plus a one-shot init service that creates `S3_BUCKET`.
  - `axllent/mailpit`, pinned: SMTP on 1025, web inbox on 8025.

  Ports are bound to `127.0.0.1` only, and data lives in named volumes.
- **`pnpm dev`** at the root runs, in order:
  1. a config check, which stops with the same messages if `.env` is wrong or missing and suggests `pnpm env:init`;
  2. `docker compose up -d --wait`;
  3. `turbo run dev` for the four apps.

  `pnpm dev:services:down` stops the services; `pnpm dev:services:reset` also deletes the volumes, after asking.
- **App dev scripts:**
  - API and worker get a minimal `main.ts` that calls `loadEnv()`, boots the existing NestJS root module and logs one startup line. The API listens on the port from `API_URL`. They run with live reload through SWC, the same compiler the tests use. M1-03 replaces this bootstrap with the real one (Pino, health checks, error filter, OpenAPI).
  - Web runs Vite on 5173 and admin on 5174.
- **Lint boundary:** add a policy so `apps/web` and `apps/admin` cannot import `@setubandh/env`. A fixture test proves it.

## Testing Decisions

- A good test here checks what the developer sees: exit codes, the boot message, and running services. It does not check Zod internals.
- **Acceptance 1 ("`pnpm dev` starts all services and apps"):**
  - An integration test (`packages/testing`) starts `docker-compose.dev.yml` with Testcontainers' compose support.
  - It then asserts four things: Postgres answers and `CREATE EXTENSION vector` works; Valkey answers `PING` with AOF on and `noeviction`; the S3 bucket exists and an object round-trips; Mailpit's API answers.
  - A second test spawns the API and worker `main.ts` with a complete test environment and asserts they start (the API answers on its port) and shut down cleanly.
  - Running the real `pnpm dev` end to end is checked by hand once and noted in the PR, because it stays in the foreground.
- **Acceptance 2 ("Missing env var stops boot with a message naming it"):**
  - Unit tests on `loadEnv()`: a missing variable is named; several missing variables are all named; an invalid URL, port and enum are each named with the reason; empty-allowed variables pass when empty; secret values never appear in the message.
  - A process-level test spawns the API with one variable removed and asserts exit code 1 and the message on stderr.
- **Drift test:** the keys in `.env.example` exactly equal the schema keys.
- **`env:init` tests:** run against a temp directory. It creates a `.env` that passes `loadEnv()`, generates different secrets on each run, and refuses to overwrite an existing file.
- **Boundary test:** `apps/web` importing `@setubandh/env` fails lint (fixture in `packages/config/test`).

## Out of Scope

- The real NestJS bootstrap: Pino with requestId, error filter, health endpoints, OpenAPI (M1-03).
- Creating `orbit_app` with NOBYPASSRLS, migrations, `withTenant` (M1-04).
- Sending email and uploading files from code (M1-14). This ticket only provides the services.
- Production and staging compose files and Caddy (M1-06 and later).
- Cloudflare tunnel for Meta webhooks (M1-08 and M1-15).

## Further Notes

- Skills used: `tdd` (tests first for `loadEnv` and `env:init`).
- `.claude/settings.json` now allows editing `.env.example` only; real `.env*` files stay blocked for Claude.

## Implementation notes (2026-11-23)

- `pnpm dev` was run by hand in the cloud sandbox: all five services healthy; api answered on :3000, web on :5173, admin on :5174, Mailpit on :8025.
- Apps run TypeScript through `@swc-node/register` (decorator metadata, workspace sources). It prints a Node `DEP0205` deprecation warning (`module.register`); harmless, revisit when the package moves to `registerHooks`.
- `SETUBANDH_ENV_FILE` overrides the `.env` path (used by boot tests so a developer's own `.env` is never read).
- API and worker exit with code 0 on SIGTERM/SIGINT after closing Nest. The worker keeps itself alive until BullMQ processors arrive in M1-03.
- Docker Hub rate-limited image pulls in the sandbox once; images are pinned (`chrislusf/seaweedfs:4.54`, `axllent/mailpit:v1.34.0`, `valkey/valkey:8.1`, `pgvector/pgvector:pg18`).
