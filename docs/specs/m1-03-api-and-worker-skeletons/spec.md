# M1-03: API and worker skeletons

Ticket: M1-03
Status: ready-for-human (implemented 2026-11-23; awaiting your review)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 1](../../plan/01-mvp-1-unified-inbox.md)
Requirements: §4.3, §12.1 (conventions, error shape, OpenAPI), §14.6 (observability), §15.2 (health)

## Problem Statement

Every later ticket needs the same plumbing: one error shape, request ids in logs, input validation, health probes for Docker and monitoring, API docs, and a worker that consumes jobs. Without it, each endpoint would invent its own.

## Solution

The API (NestJS 12 on Fastify) serves everything under `/v1` except `/health/live` and `/health/ready`. One global filter turns every failure into `{ error: { code, message, details?, requestId } }`. Zod schemas from `packages/shared` validate input and generate the OpenAPI docs (`/v1/docs`, not in production). Pino writes one JSON line per request with `requestId` (and `tenantId` once auth exists), never bodies or secrets. The worker runs BullMQ v6 on Valkey with the same logging.

## Decisions

- **Errors:** `AppError(code)` and `ERROR_CODES` (status and plain-language message per code) live in `packages/shared`. Unknown errors become `500 INTERNAL` with a generic message; the stack goes to the log only. Framework errors (404 route, malformed JSON, 413) map to codes by HTTP status.
- **Validation:** an own `ZodValidationPipe` with `@ZodBody`, `@ZodQuery`, `@ZodParams` decorators. Failures become `422 VALIDATION_FAILED` with `details.fields` (path → message). Unknown fields are dropped by Zod.
- **One Zod instance:** `packages/shared` extends Zod with `.openapi()` and re-exports `z`. A lint rule forbids importing `zod` anywhere else, so validation and docs always share schemas.
- **OpenAPI:** `@asteasolutions/zod-to-openapi` (named in §12.1), not `nestjs-zod`, which does not support NestJS 12. Modules call `registerRoute(...)` with their Zod schemas; served via `@nestjs/swagger` UI at `/v1/docs`, JSON at `/v1/docs/openapi.json`.
- **Request id:** a well-formed incoming `X-Request-Id` (8–128 safe characters) is reused, otherwise a UUIDv7 is generated. It is returned in the `X-Request-Id` header and in every error body.
- **Logs:** nestjs-pino. Authorization, cookie and webhook signature headers are redacted; request bodies are never logged; health probes are not logged. Pretty output only in development.
- **Health:** written by hand (not `@nestjs/terminus`) so a failed readiness answer uses the standard error shape: `503 SERVICE_UNAVAILABLE` with `details.checks` (`up`/`down` only, never error text). Each check times out after 2 s. The Postgres probe lives in `packages/db` (rule 1).
- **Worker:** `@nestjs/bullmq` on Valkey (`maxRetriesPerRequest: null`, retries with exponential backoff, completed jobs kept 24 h, failed 7 days). A `platform` queue with `platform.ping` as a self-check; unknown job names fail loudly. Clean shutdown on SIGTERM/SIGINT with a 25 s force-exit.

## Tests (one per acceptance criterion, plus guards)

- **"/health/ready checks Postgres and Redis":** `apps/api/test/health.int.test.ts` against real Postgres 18 and Valkey 8.1 (200 when both up, 503 naming the one that is down). Unit tests cover timeouts and that error text never leaks.
- **"Every error response has code, message, requestId":** `apps/api/test/http.test.ts`: unknown route, AppError, 422 field errors, unexpected crash (no internals), malformed JSON, request id generation, reuse and rejection.
- Logs: `apps/api/test/logging.test.ts` captures real log lines (requestId present, secrets redacted, bodies absent, errors logged with stack).
- Docs: `apps/api/test/openapi.test.ts` (served outside production, 404 in production, error schema documented).
- Worker: `apps/worker/test/queue.int.test.ts` (a real job through Valkey; unknown job fails) and boot tests.

## Notes

- Locally `/health/ready` reports `database: down` until M1-04 creates the `orbit_app` role. That is expected.
- `pnpm-workspace.yaml` now lists which packages may run install scripts (`msgpackr-extract` yes; telemetry and unused native add-ons no).
