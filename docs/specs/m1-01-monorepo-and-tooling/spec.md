# M1-01 + M1-01a: Monorepo, tooling and test harness

Ticket: M1-01, M1-01a
Status: ready-for-agent
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 1](../../plan/01-mvp-1-unified-inbox.md)
Decisions: [ADR 0011](../../adr/0011-backend-stack-refresh.md), including its 2026-11-22 addendum

## Problem Statement

The repository holds only documents. Before any product ticket (auth, workspaces, channels, the inbox) can be built, the developer needs a single place where every app and package lives, shared rules that keep Claude Code's output consistent, and a test setup that proves each acceptance criterion automatically. Without module boundaries enforced by a tool, the "import other modules only through their service" rule depends on memory and erodes. Without a ready test harness, every later ticket would invent its own way to test against Postgres, the API or a real browser.

## Solution

One pnpm + Turborepo monorepo with the four apps and five packages named in the plan. Strict TypeScript, ESLint and Prettier apply everywhere. One root command each for lint, typecheck, unit tests, integration tests, browser component tests and end-to-end tests, all green on the empty apps. A lint rule fails the build when one API or worker module reaches into another module's internals. A test harness lets later tickets write:

- backend unit tests;
- backend integration tests against real Postgres 18 (with pgvector) and Valkey 8.1;
- API tests against a real NestJS app on Fastify;
- React component tests in a real browser, with the API mocked;
- end-to-end tests across browsers, screen sizes and colour modes, with accessibility and visual checks.

## User Stories

1. As the developer, I want one `pnpm install` at the root to set up every app and package, so that I never install per folder.
2. As the developer, I want `pnpm lint`, `pnpm typecheck` and `pnpm test` at the root to cover every workspace, so that one command tells me whether the repo is healthy.
3. As the developer, I want Turborepo to cache task results, so that unchanged packages are not re-checked.
4. As the developer, I want strict TypeScript in every workspace from a shared base config, so that apps cannot quietly loosen type safety.
5. As the developer, I want one ESLint flat config shared by every workspace, so that rules stay identical everywhere.
6. As the developer, I want a lint error when a module imports another module's internals instead of its service, so that module boundaries hold as the code grows.
7. As the developer, I want apps to be unable to import from other apps, so that shared code goes through packages.
8. As the developer, I want packages to be unable to import from apps, so that dependencies only point inwards.
9. As the developer, I want Prettier to format every file the same way and a `format:check` command, so that diffs show only real changes.
10. As the developer, I want the Node and pnpm versions pinned in the repo, so that every machine and CI run uses the same toolchain.
11. As the developer, I want `pnpm test` to run unit tests without Docker, so that the fast loop stays fast.
12. As the developer, I want `pnpm test:integration` to start Postgres 18 with pgvector and Valkey 8.1 in containers, so that database and queue tests run against the real thing, not mocks.
13. As the developer, I want integration containers started once per run and shared by test files, so that the suite stays quick.
14. As the developer, I want a helper that boots a NestJS app on the Fastify adapter and sends it injected HTTP requests, so that API tests need no open port.
15. As the developer, I want a test that proves a test app boots and answers, so that I know the helper works before M1-03 adds real endpoints.
16. As the developer, I want a minimal web app shell to test against, so that frontend test tooling is proven before the design system lands.
17. As the developer, I want React component tests to run in real Chromium, so that layout, focus and events behave as they do for users.
18. As the developer, I want MSW to mock API calls in component tests, so that components are tested without a running backend.
19. As the developer, I want Testing Library queries in component tests, so that tests find elements by role and label the way users do.
20. As the developer, I want `pnpm test:e2e` to build and serve the web app and run Playwright against it, so that end-to-end tests exercise the real bundle.
21. As the developer, I want E2E projects for Chromium, Firefox and WebKit, so that cross-browser bugs show up before users find them.
22. As the developer, I want E2E projects for desktop and phone viewports, so that the responsive layout is checked on every run.
23. As the developer, I want every E2E page test to run in light and dark mode, so that both colour modes stay correct (Paper & Pastel rule).
24. As the developer, I want an axe check helper that fails on serious or critical issues, so that accessibility regressions block merges (requirements §16).
25. As the developer, I want screenshot comparison for key screens, so that unintended visual changes are caught.
26. As the developer, I want a failing E2E test to keep a trace, a screenshot and a video, so that I can see what went wrong.
27. As the developer, I want E2E fixtures ready for signed-in states, so that later tickets can add logged-in tests without rewiring the harness.
28. As the developer, I want to choose which browsers run locally with an environment variable, so that I can run only Chromium when the others aren't installed.
29. As the developer, I want each test command to print where its reports are, so that I can open them quickly.
30. As Claude Code, I want the commands in `CLAUDE.md` to exist and work, so that the "tests ship with the code" rule can be followed from the next ticket on.

## Implementation Decisions

- **Toolchain versions:**
  - Node 26 LTS (`engines`, `.nvmrc`) and pnpm 12 (`packageManager`).
  - TypeScript 6.0.x, because typescript-eslint does not yet support 7 (ADR 0011 addendum).
  - ESLint 10 flat config with typescript-eslint and `eslint-plugin-boundaries`.
  - Prettier 3, Vitest 5, Turborepo 2.
  - Vite 8 with React 19.
  - Playwright 1.65 and `@axe-core/playwright`.
  - Testcontainers 12.
  - Exact versions are pinned in the lockfile.
- **Workspaces:** `apps/api`, `apps/worker`, `apps/web`, `apps/admin`; `packages/shared`, `packages/db`, `packages/channels`, `packages/ui`, `packages/config`. Plus `packages/testing`, a test-only package holding the container setup and the NestJS test-app helper; nothing in production may import it.
- **Package names:** `@setubandh/<name>`. Every package exports TypeScript source through its `exports` field; apps compile their dependencies. Nothing is pre-built in this ticket.
- **`packages/config`** owns the shared TypeScript bases (node, react), the ESLint flat config factory, the Prettier config and the Vitest presets. Every workspace extends these instead of copying them.
- **Module boundary rule:**
  - A *module* is a folder under `apps/api/src/modules/<name>/` or `apps/worker/src/modules/<name>/`.
  - Another module may import only that module's public entry: `index.ts`, which re-exports the module's service and public types. Any other file of another module is an internal and fails lint.
  - Files inside a module may import each other freely.
  - Apps may import packages. Packages may import other packages but never apps. Apps may not import other apps.
  - This is enforced with `eslint-plugin-boundaries`.
- **Empty apps:**
  - `apps/api` and `apps/worker`: a NestJS 12 root module, plus one example module each (`example`) so the boundary rule has something real to check. No endpoints, config or logging; those are M1-02 and M1-03.
  - `apps/admin`: a minimal React + Vite shell.
  - `apps/web`: a minimal React + Vite shell with one page that shows the product name, a colour-mode toggle (light, dark, system) using the browser's `prefers-color-scheme`, and a status line read from the API's health URL. It uses plain CSS custom properties, not Astryx or Paper & Pastel tokens (M1-05 replaces them).
- **Root scripts (Turborepo tasks):** `lint`, `typecheck`, `test`, `test:integration`, `test:browser`, `test:e2e`, `format`, `format:check`, `build`. `pnpm dev`, `db:*`, `ui:audit` and `ai:evals` stay with their own tickets.
- **Integration tests:**
  - Separate Vitest projects (`*.int.test.ts`).
  - A global setup starts `pgvector/pgvector:pg18` and `valkey/valkey:8.1` once per run through Testcontainers, and passes connection URLs to test files through environment variables.
  - Containers stop at the end.
- **NestJS test helper:** creates a testing module, builds a Fastify-adapter app, initialises it and returns it for `inject` calls. Later tickets add overrides (fake clock, fake Meta API) to the same helper.
- **Browser component tests:** Vitest browser mode with the Playwright provider in Chromium, plus Testing Library and MSW's browser worker. They run as their own Vitest project (`*.browser.test.tsx`).
- **E2E tests:**
  - Playwright serves the built `apps/web` with Vite preview.
  - Projects: Chromium, Firefox, WebKit × desktop and phone viewports. `E2E_BROWSERS` narrows the browser list.
  - Light and dark mode come from Playwright's `colorScheme`, which each test sets.
  - Shared fixtures provide `axe` (fails on serious or critical violations) and a placeholder for signed-in state.
  - Traces, screenshots and videos are kept on failure. Screenshot baselines are committed per browser and platform.
  - A `PLAYWRIGHT_CHROMIUM_EXECUTABLE` variable lets sandboxes reuse a pre-installed Chromium.
- **Out of the main gates:** E2E runs only through `pnpm test:e2e`, not `pnpm test`, so the fast loop stays free of browsers. CI wiring is M1-06.

## Testing Decisions

- A good test checks behaviour a user or caller can observe (lint output, an HTTP response, what is on screen), not internals.
- **M1-01 acceptance 1** (lint, typecheck and test pass on empty apps): the commands are the test. They run in the final check, and every workspace has at least one smoke test so `pnpm test` really runs.
- **M1-01 acceptance 2** (importing another module's internals fails lint): a unit test in `packages/config` runs ESLint programmatically on fixture files laid out like `apps/api/src/modules/*`. It asserts that importing another module's internal file reports the boundaries error, and that importing its `index.ts` and same-module imports report nothing. It also checks app-to-app and package-to-app imports.
- **M1-01a backend:**
  - The `packages/testing` integration test connects to the Postgres container, creates the `vector` extension and runs a vector distance query.
  - It also checks Valkey replies to `PING`.
  - A unit test boots the example API module through the NestJS helper and asserts a 404 JSON response for an unknown route (M1-03 adds real routes).
- **M1-01a frontend:**
  - A browser component test renders the status line with MSW returning "ok" and then an error, and asserts the visible text and the alert role.
  - A second component test checks that the colour-mode toggle is keyboard-operable.
  - An E2E test loads the shell in each project, in light and dark mode. It asserts the heading and runs axe with 0 serious or critical findings, and compares a full-page screenshot.
- **Failure evidence:** a deliberately failing E2E test is run once by hand to confirm the trace, screenshot and video appear. It is not committed.
- **Prior art:** none in the repo yet. These tests become the examples later tickets copy.

## Out of Scope

- Docker Compose dev stack, typed config, `pnpm dev` (M1-02).
- Real NestJS bootstrap with Pino, error filter, health endpoints and OpenAPI (M1-03).
- Drizzle schema, migrations, RLS and the tenant isolation suite (M1-04). The integration harness is ready for them.
- Astryx, Paper & Pastel theme, Tailwind, Lucide, Geist, `audit.py` and `contrast.py` (M1-05).
- CI pipeline and Docker images (M1-06); browser installation in CI belongs there.
- Pre-commit hooks (can be added later with the `setup-pre-commit` skill if wanted).

## Further Notes

- This session runs on branch `claude/focused-ride-4gfzpa` (the cloud session's required branch), not `m1-01-monorepo-and-tooling`. Rename the branch when opening the PR if you prefer the CLAUDE.md naming.
- Ticket M1-01 was gated on merging ADR 0011. That ADR is committed on this branch and still has to be pushed and merged; the developer chose to start anyway.
- Only Chromium is pre-installed in the cloud sandbox, so local runs here use `E2E_BROWSERS=chromium`. Firefox and WebKit run wherever `playwright install` has run (developer machines, CI).
