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
| End-to-end | `apps/web/e2e/*.spec.ts`, import `test`/`expect` from `./fixtures` | `apps/web/e2e/shell.spec.ts` |
| Lint rules | `packages/config/test/*.test.ts` with fixture trees | `packages/config/test/boundaries.test.ts` |

## Writing tests

- **Test behaviour, not internals:** HTTP responses, rows the database returns, what a user sees. Find elements by role and accessible name (`getByRole`), not CSS classes.
- **Integration tests** read `inject('postgresUrl')` and `inject('valkeyUrl')`. For database tests, `createTestDatabase(inject('postgresUrl'))` gives each test file its own empty database; run `migrate({ adminUrl, appUrl })` and connect with `createDatabase(testDb.appUrl)` (the real `orbit_app` role, so RLS applies). The containers are shared by the whole run, so each test creates its own data (unique IDs) and does not depend on order. From M1-04, database tests go through `db.withTenant()` and the tenant isolation suite.
- **API tests:** `const app = await createTestApp({ imports: [SomeModule] })`, then `await app.inject({ method, url, payload })`, and `await app.close()` in `afterAll`. Override providers with `createTestApp(meta, { override: (b) => b.overrideProvider(X).useValue(fake) })`.
- **Component tests:** add API responses per test with `worker.use(http.get(url, () => HttpResponse.json(...)))`. Unhandled requests fail the test. Use `userEvent` from `vitest/browser` for real clicks and keys.
- **E2E tests:**
  - Use the `mockApi`, `expectAccessible` and (from M1-09) signed-in fixtures from `e2e/fixtures.ts`.
  - Every page test runs in both colour modes (`COLOR_SCHEMES`) and calls `expectAccessible()`.
  - Screenshot only key screens.
- **Screenshot baselines** live in `apps/web/e2e/__screenshots__/<project>/`. After an intended visual change, run `pnpm --filter @setubandh/web test:e2e:update` and review the new images in the diff. Baselines are per browser and per platform, so create Firefox and WebKit baselines (and CI baselines) on the machine that will check them (M1-06).
- **Failures:** Playwright keeps a trace, a screenshot and a video under `apps/web/test-results/`. Open a trace with `pnpm --filter @setubandh/web exec playwright show-trace <path>/trace.zip`. The HTML report is in `apps/web/playwright-report/`.
