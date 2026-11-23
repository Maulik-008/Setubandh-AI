# 0012. Astryx + Paper & Pastel theme: token names and button variants

- Status: accepted
- Date: 2026-11-23
- Ticket: M1-05 (design system spike)
- Answers: requirements Q-12 ("Astryx theme override approach confirmed by the P0-05 spike: token names, button variant theming")
- Implements: ADR-08 (Astryx components themed with Paper & Pastel tokens), requirements §13.3

## Context

ADR-08 settled that Astryx renders the components and Paper & Pastel supplies the look. Requirements §13.3.2 described the theme with token names marked "verify exact names with the CLI", and left open how Astryx button variants take the Paper & Pastel button doctrine (one filled ink pill per view; the cobalt accent is never a fill). The week 1 decisions also asked whether Astryx works with Vite 8.

Everything below was checked against the installed release with `astryx docs tokens`, `astryx theme targets`, `astryx component <Name> --detail full`, and by tests.

## Decision

### Versions and build tool

- All Astryx packages pinned exactly at the same release: `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli` **0.7.17**. Also pinned: `@stylexjs/stylex` 0.19.2 (Core's peer), `tailwindcss` / `@tailwindcss/vite` 4.3.5, `lucide-react` 1.77.0, `@fontsource-variable/geist` and `geist-mono` 5.3.0.
- **Vite 8 works.** Astryx ships prebuilt CSS and JS; no StyleX or Babel plugin is needed. No fallback to Vite 7.
- Upgrades go through `astryx upgrade` in their own ticket, then `pnpm --filter @setubandh/ui theme:build`.

### Where the theme lives

- Source: `packages/ui/src/theme/paperPastelTheme.ts`, `defineTheme({ name: 'paper-pastel', extends: neutralTheme, ... })`. Paper & Pastel values come from `packages/ui/src/theme/tokens.ts`, a copy of the skill's `tokens.css` + `a11y-text.css` + `--input-edge`; a unit test fails if it drifts from the skill files.
- Build: `astryx theme build` writes `paper-pastel.{css,js,d.ts}` beside the source. The apps load the **built** theme (static CSS, no runtime style injection). A unit test runs `astryx theme build --check`, so stale output fails CI.
- The build output sits in `src/theme/`, not in `styles/paper-pastel-theme.css` as §13.3.2 sketched, because the generated JS imports the icon registry by a relative path from beside the source.

### Token names (confirmed)

Astryx owns the names, Paper & Pastel the values. A test asserts that every name the theme sets exists in Astryx's `tokenVars`.

| Astryx token | Paper & Pastel token |
|---|---|
| `--color-background-body` | `background` (paper white / ink black) |
| `--color-background-surface`, `--color-background-card` | `card` (= `surface-1`) |
| `--color-background-popover`, `--color-background-muted` | `popover`, `muted` |
| `--color-text-primary`, `--color-text-secondary` | `foreground`, `muted-foreground` |
| `--color-accent`, `--color-text-accent`, `--color-icon-accent`, `--color-on-accent` | `primary` (cobalt), `primary-foreground` |
| Focus ring | `--focus-outline-color` already defaults to `var(--color-accent)`, so it is the cobalt `--ring`; `--focus-outline-offset: 2px` |
| `--color-border` | `border` (the hairline) |
| `--color-border-emphasized` | `input-edge` (3:1 input boundary, WCAG 1.4.11) |
| `--color-success` / `--color-warning` / `--color-error` (+ `--color-on-*`) | `success` / `warning` / `destructive` (+ `*-foreground`) |
| `--color-<status>-muted`, `--color-on-<status>-muted`, `--color-text-<status>` | the tint washes and the AA-safe `-ink` text colours. Dark-mode error text uses `chip-coral-ink`, because `destructive-ink` reads 4.36:1 on the dark coral tint |
| Hue families `--color-{background,text,icon,border}-<hue>` (Badge, Card colours) | `tint-*`, `chip-*-ink`, `accent-*`. Astryx has nine hues; they fold onto the six: blue→blue, purple→violet, green→emerald, red and pink→coral, orange and yellow→amber, teal and cyan→teal |
| `--color-data-categorical-<color>` | the six `accent-*` hues. Astryx names are `blue orange purple green pink cyan red teal brown indigo`, not Paper & Pastel's; the four extra series repeat a hue, so charts must use at most six series |
| `--radius-container` / `--radius-page` / `--radius-element` / `--radius-inner` | 24px / 28px / 12px (inputs) / 8px |
| `--size-element-sm/md/lg` | 36 / 40 / 48px (Paper & Pastel button heights) |
| `--shadow-low/med/high` | layered soft shadows from `--shadow-color`; nothing uses them at rest |
| Fonts | `typography.body/heading` = `Geist Variable`, `typography.code` = `Geist Mono Variable` (loaded by `@fontsource-variable/*` in `globals.css`) |
| Icons | the theme's icon registry draws Lucide at `strokeWidth` 1.75 |

Tokens Astryx has no name for (`cta`, `surface-0..5`, `tint-*`, `chip-*`, `chip-*-ink`, `input-edge`, `on-tint`) live in `packages/ui/styles/paper-pastel-extras.css`, generated from `tokens.ts`, as `--pp-*` variables exposed through `@theme inline`: `bg-cta`, `bg-surface-1`, `bg-tint-violet`, `bg-chip-coral/15`, `text-chip-coral-ink`, `bg-on-tint`. A test checks none of them collides with a name in the Astryx Tailwind bridge. As §13.3.2 says, `text-primary` is the primary text colour (Astryx meaning) and the accent is `text-accent`.

### Button variant mapping (confirmed)

Astryx 0.7.17 Button variants are `primary | secondary | ghost | destructive` (there is no `outline`).

| Astryx variant | Paper & Pastel style |
|---|---|
| `primary` | the **ink `cta` pill**, `cta-foreground` text; the only filled button, one per view |
| `secondary` (Astryx default) | outline pill: transparent, 1px `input` border, primary text |
| `ghost` | ghost pill: transparent, primary text |
| `destructive` | outline pill with error text and border; it is **not** filled, so the ink pill stays the only filled button |

All buttons and badges are pills (`borderRadius: 9999px`); inputs keep `--radius-element` (12px). Status badges use the pale fill with ink text, never a strong fill. These are `components` overrides in the theme, so no page styles a button.

### Colour mode

`<AppTheme>` in `@setubandh/ui` wraps the app in Astryx `<Theme theme={paperPastelTheme} mode={mode}>` and only remembers the choice (light, dark or system) in `localStorage`. Astryx sets `data-theme` on `<html>` for light and dark and **removes it for system**, leaving `color-scheme: light dark`. The extras therefore use `light-dark()` instead of a `[data-theme="dark"]` block (§13.3.1), so they follow all three modes the same way the Astryx tokens do.

### Cascade layers

`packages/ui/styles/globals.css` declares `@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;` before any import, in the §13.3.2 order, and each app imports it first in `main.tsx`. A browser test proves that a Tailwind utility on `className` beats both the Astryx component style and the theme override; the test fails if the layer order is changed.

## Alternatives considered

- **Runtime theme** (`defineTheme` in app code, styles injected on mount): simpler, but component overrides arrive after first paint and Astryx recommends built themes for known themes.
- **`themePalette()` from seed colours:** generates its own shades, so the values would no longer be Paper & Pastel's measured tokens.
- **A custom `outline` button variant:** possible through theme module augmentation, but `secondary` already is the outline, and a second name for one style invites drift.
- **Extras in Astryx `localTokens`:** would work, but §13.3.2 asks for a separate extras file, and Tailwind needs the `@theme` block anyway.
- **Vite 7:** not needed.

## Consequences

- UI tickets use Astryx components with no per-page colour, radius or shadow styles; Tailwind is for layout and the extras utilities. `pnpm ui:audit` (contrast.py on `tokens.ts`, audit.py on all UI sources) and axe in E2E gate every change.
- A token change means: edit `tokens.ts`, run `pnpm --filter @setubandh/ui theme:build`, re-run `pnpm ui:audit`, review the screenshot diffs.
- The built theme module imports `@astryxdesign/theme-neutral` at runtime (Astryx's generated code merges the base icons). With the demo page the web bundle is about 267 KB gzip, above the 250 KB budget for the inbox route (§13.6). Route-level code splitting arrives with React Router; revisit the budget then.
- Astryx is in Beta. Pinned versions plus the `--check` and drift tests make an upgrade visible, and composed components stay in `packages/ui`.
