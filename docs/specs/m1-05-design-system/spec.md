# M1-05: Design system spike (Astryx + Paper & Pastel)

Ticket: M1-05 (also closes the last M1-07 item: Astryx agent docs merged into `CLAUDE.md`)
Status: ready-for-human (implemented 2026-11-23; awaiting your review)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 1](../../plan/01-mvp-1-unified-inbox.md)
Requirements: §13.3 (13.3.1 ownership, 13.3.2 theme implementation, 13.3.3 rules), §13.6 (quality budgets), Q-12
Decision: [ADR 0012](../../adr/0012-astryx-paper-pastel-theme.md)

## Problem

Every UI ticket after week 1 needs one answer to "how do Astryx components get the Paper & Pastel look": which Astryx token names to set, how button variants map to the one-ink-pill doctrine, how Tailwind and Astryx share the cascade, and whether Astryx runs on Vite 8. Without it each screen would invent its own styles.

## Solution

- `packages/ui` holds the theme and the shared pieces:
  - `src/theme/tokens.ts`: Paper & Pastel values (light/dark HSL channels), checked against the skill files by a test.
  - `src/theme/paperPastelTheme.ts`: `defineTheme({ extends: neutralTheme })` mapping the values onto Astryx tokens and component overrides; built with `astryx theme build` into `paper-pastel.{css,js}`.
  - `styles/paper-pastel-extras.css`: identity tokens Astryx lacks, generated from `tokens.ts`, exposed as Tailwind utilities with non-colliding names.
  - `styles/globals.css`: the §13.3.2 cascade-layer order, Geist fonts, Astryx CSS, built theme, Tailwind bridge, extras, utilities.
  - `<AppTheme>` (Astryx `<Theme>` + remembered mode), `<ColorModeToggle>` (light / dark / system), `LineIcon` (Lucide at stroke 1.75), `CATEGORY_CLASSES` static hue maps.
- `apps/web` and `apps/admin` import `globals.css` first, wrap in `<AppTheme>`, and use Tailwind through `@tailwindcss/vite`. The M1-01a placeholder toggle and plain CSS tokens are gone.
- `apps/web` shows a specimen page: buttons (one ink CTA, outline, ghost, destructive outline; loading, disabled, icon-only), inputs and selects (helper, error with the fix, disabled, loading), category tint cards and badges, a table with data / loading skeleton / empty / error-with-retry states, a dialog with validate-on-submit, and toasts (including Undo).
- `pnpm ui:audit` runs `contrast.py` on the real token values and `audit.py` on all UI sources.

## Decisions

- Astryx 0.7.17 (core, theme-neutral, cli) pinned exactly; **Vite 8 works**, no fallback.
- Token names and the button mapping are in ADR 0012 (answers Q-12). Astryx has no `outline` button: `secondary` is the outline pill; `destructive` is an outline too, so the ink pill stays the only filled button.
- In system mode Astryx removes `data-theme`, so the extras use `light-dark()` rather than a `[data-theme="dark"]` block.
- Inputs use the strict-AA `--input-edge` (3:1) as Astryx's `--color-border-emphasized`.
- `pnpm-workspace.yaml` now lists the Astryx postinstall scripts (they only print an "init" hint) and the Testcontainers native extras as not allowed to build, so `pnpm install` and `pnpm exec` stop failing on ignored builds.

## Tests (acceptance criterion → test)

| Acceptance | Test |
|---|---|
| Both modes match the prototype look (white paper / ink, one ink button, pastel chips) | `apps/web/e2e/design-system.spec.ts`: exactly one button painted ink and it is the main action; tint card colours and Geist; full-page screenshot baselines in light and dark for chromium desktop and phone (reviewed by eye) |
| Tailwind utilities override Astryx defaults (layer order) | `packages/ui/test/layers.browser.test.tsx`: `rounded-none px-12` beats the theme's pill radius and Astryx padding in real Chromium (fails if the `@layer` order changes) |
| `contrast.py` passes, `audit.py` 0 errors, axe 0 serious | `pnpm ui:audit`; axe via `expectAccessible` on the page, the dialog and the loading / empty / error table states, in both modes |
| ADR for Q-12 | `docs/adr/0012-astryx-paper-pastel-theme.md`; `packages/ui/test/theme.test.ts` asserts the mapped names exist in Astryx and resolve to the Paper & Pastel values |

Also: `test/tokens.test.ts` (values equal the skill ground truth), `test/extras.test.ts` (extras file up to date, no bridge name collisions), `theme.test.ts` (`astryx theme build --check`), `ColorModeToggle.browser.test.tsx` (mouse, keyboard, remembered, system mode), `e2e/shell.spec.ts` (system mode by default, manual choice survives reload, API-down alert).

## Notes

- The web bundle is about 267 KB gzip with the specimen page, above the 250 KB inbox-route budget (§13.6). Route-level code splitting comes with React Router; recheck then.
- Firefox and WebKit screenshot baselines are not committed (only Chromium is available here); create them on the CI machine (M1-06).
- `tokens.ts` copies the skill tokens: after editing the skill's `tokens.css`, update `tokens.ts` and run `pnpm --filter @setubandh/ui theme:build`.
