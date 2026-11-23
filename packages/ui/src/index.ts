/**
 * @setubandh/ui: the Paper & Pastel theme on Astryx and the pieces every app shares.
 * Apps import `@setubandh/ui/globals.css` first, then wrap the tree in `<AppTheme>`.
 * Components come straight from `@astryxdesign/core/<Name>`; composed ones land here.
 */
export { AppTheme, useColorMode } from './color-mode/AppTheme';
export { ColorModeToggle } from './color-mode/ColorModeToggle';
export { COLOR_MODES, type ColorMode } from './color-mode/storage';
export { LineIcon } from './LineIcon';
export { CATEGORY_BADGE_VARIANT, CATEGORY_CLASSES } from './palette';
export { ICON_STROKE_WIDTH } from './theme/icons';
export { CATEGORY_HUES, paperPastelTokens, type CategoryHue } from './theme/tokens';
