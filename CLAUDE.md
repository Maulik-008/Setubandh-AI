# Setubandh AI — rules for Claude Code

> Product working name in the docs is **Orbit**. The repo and product are **Setubandh AI**. Treat "Orbit" in `docs/` as the same product; do not rename inside docs or code unless asked (requirements Q-01).

## Project status

**Pre-code.** The repo currently holds requirements, milestone plans and a UI prototype only. Nothing is scaffolded yet: the monorepo, Docker stack and CI are tickets M1-01 to M1-07. Do not assume `pnpm` scripts or folders in "Stack" exist until the matching ticket is done.

## Read first

- `docs/requirements.md` — single source of truth (PRD + TRD). Read only the sections the ticket references.
- `docs/plan/01-mvp-1-unified-inbox.md` — **MVP 1 scope only.** Anything not listed there is out of scope for MVP 1, even if `requirements.md` mentions it. If it is needed, add it to the plan file first.
- `docs/plan/02-mvp-2-ai-answers.md`, `docs/plan/03-later-milestones-m3-m6.md` — later work; do not build ahead.
- `docs/prototype/setubandh_prototype.html` — interactive UI reference (layout and behaviour, not production code).
- For any UI work: `.claude/skills/paper-pastel-studio/SKILL.md` and the Astryx agent docs (`npx @astryxdesign/cli docs <topic>`, once installed).

## Stack (target, per requirements §4.3 and ADR 0011)

pnpm + Turborepo monorepo. Backend: Node 26 LTS, NestJS 12 (Fastify 5), Drizzle ORM 0.45 (pinned), PostgreSQL 18 + pgvector, BullMQ v6 OSS + Valkey 8.1, Socket.IO, Cloudflare R2 via the S3 API (ADR 0011).
Frontend: React 19, Vite 8, Astryx (`@astryxdesign/core`) themed with Paper & Pastel, Tailwind v4 via the Astryx bridge, TanStack Query, React Router v7, Zod.
AI (MVP 2): Claude API via `@anthropic-ai/sdk`; model IDs come from config, never hard-coded.

## Commands (available once M1-01 / M1-02 land)

`pnpm dev` | `pnpm test` | `pnpm test:integration` | `pnpm lint` | `pnpm typecheck` | `pnpm db:migrate` | `pnpm db:seed` | `pnpm ui:audit` | `pnpm ai:evals`

## Non-negotiable rules

1. **Tenant isolation:** every tenant query goes through `db.withTenant()`. Never use the raw pool outside `packages/db`. Every new tenant table needs `tenant_id`, an RLS policy (USING + WITH CHECK), FORCE RLS, and a test in the isolation suite.
2. Validate every input with a Zod schema from `packages/shared`. Share schemas between API and UI.
3. **Permissions:** every endpoint declares `@RequirePermission(...)`. UI uses `<Can>`. The server is the authority.
4. Money is integer minor units + currency. Never floats.
5. The AI never states prices from memory; prices come from tools. New AI behaviour needs an eval case.
6. Webhook handlers only verify, store and enqueue. Processing happens in the worker and must be idempotent.
7. No secrets, tokens or message bodies in logs.
8. UI: Astryx components first; Paper & Pastel rules (one ink CTA per view, six category hues, tokens only, Lucide icons stroke 1.75, Geist fonts, every state designed, WCAG 2.2 AA). No raw hex, no Tailwind palette classes, no class names built by concatenation.
9. Every acceptance criterion in the ticket has a test.
10. Do not add features that are not in the ticket. Ask when the document is unclear.

## Working agreement

- **One ticket = one branch = one session.** Branch name: `m1-09-auth-core` (milestone ticket ID + slug).
- **Plan first.** Read the ticket and its referenced sections, propose a plan (files, migrations, API, UI, tests), and wait for approval before writing code.
- Tests ship with the code. Keep diffs small; split a ticket past ~600 changed lines.
- **Never** push to `main`, force-push, or commit/edit real secrets or `.env` files. Only `.env.example` (names, no values) is tracked.
- If a decision changes, update the docs first (new ADR in `docs/adr/`), then code. ADR-01 to ADR-10 are settled (requirements §4.4); do not reopen them inside a ticket.
- Definition of Done: `docs/plan/01-mvp-1-unified-inbox.md` §11 (and requirements §17.5).

## Conventions

- Modules: `apps/api/src/modules/<module>/{controller,service,repository,dto}.ts`; import other modules only via their service (eslint-plugin-boundaries).
- Errors: throw `AppError(code)` from `packages/shared/errors.ts`.
- Commits: Conventional Commits with the ticket ID, e.g. `feat(inbox): take over conversation [M1-23]`.

## Slash commands (`.claude/commands/`)

`/ticket <ID>` load a ticket and propose a plan · `/rls-check` scan the diff for tenant-isolation gaps · `/ui-review` Paper & Pastel review of changed screens · `/evals` run AI evals (MVP 2+)

## Agent skills

### Issue tracker

Specs and issues are local Markdown in `docs/specs/<ticket-id>-<slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.

### Installed skills

Third-party skills and their licences are listed in `.claude/skills/THIRD_PARTY_SKILLS.md`. Stack skills: `nestjs-best-practices`, `postgres-best-practices`, `playwright-cli`, `react-composition-patterns`, `tdd`, `property-based-testing`, `differential-review`, `supply-chain-risk-auditor`. Their "Setubandh AI overrides" notes and this file win over their examples.
