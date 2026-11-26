import { useEffect } from 'react';

/** Every screen names itself in the tab title (WCAG 2.4.2). */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · Setubandh AI`;
  }, [title]);
}
