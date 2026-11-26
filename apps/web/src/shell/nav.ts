import type { LucideIcon } from 'lucide-react';
import { Home, Inbox, Settings } from 'lucide-react';

/** Main navigation (requirements §13.4; MVP 1 has Home, Inbox, Settings). */
export const NAV_ITEMS: {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  isActive: (path: string) => boolean;
}[] = [
  { to: '/', labelKey: 'nav.home', icon: Home, isActive: (p) => p === '/' },
  { to: '/inbox', labelKey: 'nav.inbox', icon: Inbox, isActive: (p) => p.startsWith('/inbox') },
  {
    to: '/settings/workspace',
    labelKey: 'nav.settings',
    icon: Settings,
    isActive: (p) => p.startsWith('/settings'),
  },
];
