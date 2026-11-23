import type { CategoryHue } from './theme/tokens';

/**
 * Static class maps for the six category hues. Tailwind only generates classes
 * it can read whole, so never build `bg-tint-${hue}` by concatenation
 * (Paper & Pastel gotcha 1); look the hue up here instead.
 */
export const CATEGORY_CLASSES: Record<
  CategoryHue,
  { tint: string; chip: string; glyph: string; ink: string }
> = {
  blue: {
    tint: 'bg-tint-blue',
    chip: 'bg-chip-blue/15',
    glyph: 'text-chip-blue',
    ink: 'text-chip-blue-ink',
  },
  violet: {
    tint: 'bg-tint-violet',
    chip: 'bg-chip-violet/15',
    glyph: 'text-chip-violet',
    ink: 'text-chip-violet-ink',
  },
  emerald: {
    tint: 'bg-tint-emerald',
    chip: 'bg-chip-emerald/15',
    glyph: 'text-chip-emerald',
    ink: 'text-chip-emerald-ink',
  },
  coral: {
    tint: 'bg-tint-coral',
    chip: 'bg-chip-coral/15',
    glyph: 'text-chip-coral',
    ink: 'text-chip-coral-ink',
  },
  amber: {
    tint: 'bg-tint-amber',
    chip: 'bg-chip-amber/15',
    glyph: 'text-chip-amber',
    ink: 'text-chip-amber-ink',
  },
  teal: {
    tint: 'bg-tint-teal',
    chip: 'bg-chip-teal/15',
    glyph: 'text-chip-teal',
    ink: 'text-chip-teal-ink',
  },
};

/** Astryx Badge / Card colour variant that carries each category hue in this theme (ADR 0012). */
export const CATEGORY_BADGE_VARIANT = {
  blue: 'blue',
  violet: 'purple',
  emerald: 'green',
  coral: 'red',
  amber: 'orange',
  teal: 'teal',
} as const satisfies Record<CategoryHue, string>;
