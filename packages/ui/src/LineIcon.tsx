import type { LucideIcon } from 'lucide-react';
import { ICON_STROKE_WIDTH } from './theme/icons';

/**
 * A decorative Lucide icon at the Paper & Pastel stroke (1.75), sized to the
 * surrounding text. Pass it to Astryx `icon` props or place it inside a chip.
 * Name the control, not the icon: it is hidden from assistive technology.
 */
export function LineIcon({ icon: Glyph, className }: { icon: LucideIcon; className?: string }) {
  return (
    <Glyph size="1em" strokeWidth={ICON_STROKE_WIDTH} aria-hidden="true" className={className} />
  );
}
