import type { ReactNode } from 'react';

/**
 * Wide tables scroll sideways inside their card on a phone instead of crushing their columns;
 * the page itself never scrolls sideways (craft: content survives 320px). Keyboard users can
 * reach the scroller (tabIndex) and it is named for screen readers.
 */
export function ScrollableTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      tabIndex={0}
      className="-mx-6 overflow-x-auto px-6 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="min-w-xl">{children}</div>
    </section>
  );
}
