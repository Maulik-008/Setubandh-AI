# Testing guide

How to run and write tests in this repo (requirements §16, ticket M1-01a). Every acceptance criterion in a ticket needs a test at one of these layers.

## Commands (from the repo root)

| Command | What runs | Needs |
|---|---|---|
| `pnpm test` | Unit tests in every workspace (Vitest, Node) | Nothing |
| `pnpm test:integration` | `*.int.test.ts` against real Postgres 18 + pgvector and Valkey 8.1 (Testcontainers) | Docker |
| `pnpm test:browser` | React component tests in real Chromium (Vitest browser mode + Playwright), API mocked with MSW | Playwright Chromium |
| `pnpm test:e2e` | Builds `apps/web`, serves it, runs Playwright across browsers, viewports and colour modes, with axe and screenshot checks | Playwright browsers |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Static checks, including module boundaries | Nothing |

First time on a machine: `pnpm install`, then `pnpm --filter @setubandh/web exec playwright install --with-deps` for the browsers.

### Environment switches

| Variable | Effect |
|---|---|
| `E2E_BROWSERS=chromium,webkit` | Run only some browsers (default: chromium, firefox, webkit) |
| `E2E_VIDEO=off` | Skip video recording (when Playwright's ffmpeg is not installed) |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome` | Reuse a pre-installed Chromium for browser and E2E tests (cloud sandboxes) |
| `CI=1` | E2E retries twice, forbids `test.only`, never reuses a running server |

## Where tests live

| Layer | File pattern | Example |
|---|---|---|
| Unit | `test/**/*.test.ts` or next to the code as `*.test.ts` | `apps/api/test/app.module.test.ts` |
| API (NestJS on Fastify) | unit project, uses `createTestApp` from `@setubandh/testing` | `apps/api/test/http.test.ts` |
| Integration | `*.int.test.ts`, project `integration`, `globalSetup` from `@setubandh/testing/global-setup` | `packages/testing/test/infra.int.test.ts` |
| Browser component | `src/**/*.browser.test.tsx` | `apps/web/src/components/ApiStatus.browser.test.tsx` |
| Browser, shared UI and styles | `packages/ui/{src,test}/**/*.browser.test.tsx`, loads the real `globals.css` | `packages/ui/test/layers.browser.test.tsx` |
| Design-system gates | `pnpm ui:audit` (contrast.py on the theme tokens, audit.py on UI sources); `packages/ui/test/*.test.ts` guard token drift and stale theme builds | `packages/ui/test/theme.test.ts` |
| End-to-end | `apps/web/e2e/*.spec.ts`, import `test`/`expect` from `./fixtures` | `apps/web/e2e/shell.spec.ts` |
| Lint rules | `packages/config/test/*.test.ts` with fixture trees | `packages/config/test/boundaries.test.ts` |

## Writing tests

- **Test behaviour, not internals:** HTTP responses, rows the database returns, what a user sees. Find elements by role and accessible name (`getByRole`), not CSS classes.
- **Integration tests** read `inject('postgresUrl')` and `inject('valkeyUrl')`. The API's integration project uses `global-setup-services`, which also starts Mailpit (`inject('mailpit')`: SMTP host and port, HTTP API URL) and SeaweedFS (`inject('s3')`: endpoint, bucket, keys). Tests that run the worker spawn it as a process (`spawnApp`) and use their own Valkey database (`${valkeyUrl}/7`) so queues do not mix. For database tests, `createTestDatabase(inject('postgresUrl'))` gives each test file its own empty database; run `migrate({ adminUrl, appUrl })` and connect with `createDatabase(testDb.appUrl)` (the real `orbit_app` role, so RLS applies). The containers are shared by the whole run, so each test creates its own data (unique IDs) and does not depend on order. From M1-04, database tests go through `db.withTenant()` and the tenant isolation suite.
- **Tenant isolation suite (M1-12):** `packages/db/test/tenant-isolation.int.test.ts` checks every table with `tenant_id`, and `apps/api/test/isolation.int.test.ts` calls every workspace endpoint as another tenant. Both discover tables and routes on their own; a new table or route without a fixture fails with a message naming the fixture to add.
- **API tests:** `const app = await createTestApp({ imports: [SomeModule] })`, then `await app.inject({ method, url, payload })`, and `await app.close()` in `afterAll`. Override providers with `createTestApp(meta, { override: (b) => b.overrideProvider(X).useValue(fake) })`.
- **Component tests:** add API responses per test with `worker.use(http.get(url, () => HttpResponse.json(...)))`. Unhandled requests fail the test. Use `userEvent` from `vitest/browser` for real clicks and keys.
  - `src/test/render.tsx` renders the real routes at any URL (`renderApp('/settings/members')`) and has `mockSession`, `mockWorkspaces` and `apiError`.
  - Find elements with `findVisibleByRole` / `findVisibleText`: AppShell keeps a hidden copy of the side nav for the mobile drawer, and Astryx announcers copy messages, so the first match can be hidden.
  - If a test ends while a request is in flight, wait for that request: a late request fails the next test as unhandled.
- **E2E tests:**
  - Use `mockApi` (signed out), `mockSignedInApi(page)` (signed in, two workspaces, members) and `expectAccessible` from `e2e/fixtures.ts`.
  - Playwright builds the app with `vite build --mode e2e` (production code plus the `/dev/design-system` page) and never reuses a running server.
  - Every page test runs in both colour modes (`COLOR_SCHEMES`) and calls `expectAccessible()`.
  - Screenshot only key screens.
- **Screenshot baselines** live in `apps/web/e2e/__screenshots__/<project>/`. After an intended visual change, run `pnpm --filter @setubandh/web test:e2e:update` and review the new images in the diff. Baselines live under `__screenshots__/<platform>/` and the committed Linux ones are owned by CI: after an intended change, delete the affected baselines and run the CI workflow manually with **refresh-screenshots**, which commits new ones from CI's browsers. Other operating systems write their own local baselines.
- **Failures:** Playwright keeps a trace, a screenshot and a video under `apps/web/test-results/`. Open a trace with `pnpm --filter @setubandh/web exec playwright show-trace <path>/trace.zip`. The HTML report is in `apps/web/playwright-report/`.
