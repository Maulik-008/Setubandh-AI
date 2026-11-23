# Setubandh AI — rules for Claude Code

> Product working name in the docs is **Orbit**. The repo and product are **Setubandh AI**. Treat "Orbit" in `docs/` as the same product; do not rename inside docs or code unless asked (requirements Q-01).

## Project status

**Week 1 foundations done (M1-01 to M1-07).** The pnpm + Turborepo monorepo, strict TypeScript, ESLint module boundaries and the full test harness exist. Also in place: the local Docker stack and typed config (`packages/env`); the API/worker skeletons (errors, logging, health, OpenAPI, BullMQ); the database foundation (`packages/db`: Drizzle, `withTenant`, RLS; read `packages/db/README.md` before adding a tenant table); the design system (Astryx + Paper & Pastel in `packages/ui`; `apps/web` shows its specimen page); CI (`.github/workflows/ci.yml`) and Docker images (`infra/docker/`). Do not assume a script or folder exists until its ticket is done.

## Read first

- `docs/requirements.md` — single source of truth (PRD + TRD). Read only the sections the ticket references.
- `docs/plan/01-mvp-1-unified-inbox.md` — **MVP 1 scope only.** Anything not listed there is out of scope for MVP 1, even if `requirements.md` mentions it. If it is needed, add it to the plan file first.
- `docs/plan/02-mvp-2-ai-answers.md`, `docs/plan/03-later-milestones-m3-m6.md` — later work; do not build ahead.
- `docs/prototype/setubandh_prototype.html` — interactive UI reference (layout and behaviour, not production code).
- For any UI work: `.claude/skills/paper-pastel-studio/SKILL.md` then the "Design system (Astryx)" section below and ADR 0012.

## Stack (target, per requirements §4.3 and ADR 0011)

pnpm + Turborepo monorepo. Backend: Node 26 LTS, NestJS 12 (Fastify 5), Drizzle ORM 0.45 (pinned), PostgreSQL 18 + pgvector, BullMQ v6 OSS + Valkey 8.1, Socket.IO, Cloudflare R2 via the S3 API (ADR 0011).
Frontend: React 19, Vite 8, Astryx (`@astryxdesign/core`) themed with Paper & Pastel, Tailwind v4 via the Astryx bridge, TanStack Query, React Router v7, Zod.
AI (MVP 2): Claude API via `@anthropic-ai/sdk`; model IDs come from config, never hard-coded.

## Commands

Available now: `pnpm env:init` | `pnpm env:check` | `pnpm dev` | `pnpm dev:services` / `:down` / `:reset` | `pnpm db:migrate` | `pnpm db:seed` | `pnpm build` | `pnpm lint` | `pnpm typecheck` | `pnpm test` | `pnpm test:integration` (Docker) | `pnpm test:browser` | `pnpm test:e2e` | `pnpm ui:audit` (contrast.py + audit.py, Python 3) | `pnpm format` | `pnpm format:check`. How to write each kind of test: `docs/testing.md`.
Later tickets add: `pnpm ai:evals` (MVP 2).

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

## Design system (Astryx) — repo rules

The block after this section is written by `astryx init` (refresh it with `astryx init --agent claude` after an upgrade; do not hand-edit it). Where it disagrees with this repo, these rules win:

- Run the CLI as `pnpm --filter @setubandh/ui exec astryx <cmd>` (it is pinned with Core at 0.7.17; all `@astryxdesign/*` versions stay exact and equal).
- **Tailwind v4 is set up** (Astryx bridge + cascade layers in `packages/ui/styles/globals.css`): use utilities for layout. Colours, radius and shadows come from the theme, never page styles. Extra identity utilities: `bg-cta`, `bg-surface-1..5`, `bg-tint-{hue}`, `bg-chip-{hue}/15`, `text-chip-{hue}-ink`, `bg-on-tint`; take hue classes from `CATEGORY_CLASSES` (never concatenate). `text-primary` = primary text, `text-accent` = cobalt.
- Theme: edit values in `packages/ui/src/theme/tokens.ts` and mappings in `paperPastelTheme.ts`, then `pnpm --filter @setubandh/ui theme:build`. Do not use the experimental theme editor or `theme add`; ADR 0012 has the token and button-variant mapping.
- Apps import `@setubandh/ui/globals.css` first in `main.tsx` and wrap in `<AppTheme>` (Astryx `<Theme>`); the mode switch is `<ColorModeToggle>`.
- Button: `variant="primary"` is the ink pill, one per view; default (secondary) is the outline pill; `destructive` is an outline too. Icons: `<LineIcon icon={...} />` (Lucide, stroke 1.75).
- Before finishing UI work: `pnpm ui:audit`, axe via `expectAccessible` in both modes, and look at the screenshots.

<!-- ASTRYX:START -->
Astryx v0.7.17 · 174 components
CLI: run every command as `pnpm dlx @astryxdesign/cli@0.7.17 <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx component <Name>` to read props before using one; `astryx template <Block>` prints a block example to read for a part it lacks. Astryx names differ from other libraries: buttons, badges, tokens and tabs take their text in `label` (Text, Heading and Link take children), booleans start with `is` or `has` (`isOpen`, `isDisabled`), and every input takes `value` and `onChange`.
Changing an existing page? Keep it: skip step 2 and add components inside its sections; read a block example when it helps.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides; so does a denser or roomier app (`editor set <name> spacing tight`), never gap and padding changes page by page. A change to one kind of part (the sidebar, its selected item, the gaps in a form) is a theme change too, not props on one page: `editor how "<ask>"` names the `set … --on <part>` line. No app yet: `astryx experimental theme preview app <dir>` makes a starter app that shows the theme. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` (takes pictures of real components) and open the PNGs it writes; a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
To remove this block, run `astryx init --remove-agents`, which removes it from the agent files at the project root and in the folder you run it in; from any other file it leaves, delete everything from ASTRYX:START to ASTRYX:END.
<!-- ASTRYX:END -->
