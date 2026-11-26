import { CATEGORY_CLASSES, LineIcon } from '@setubandh/ui';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { NAV_ITEMS } from './nav';

const PILL_BASE =
  'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-[background-color,color] duration-150 ease-out';
const PILL = [PILL_BASE, 'border border-border text-primary hover:bg-surface-2'].join(' ');
const PILL_ACTIVE = [PILL_BASE, CATEGORY_CLASSES.blue.tint, CATEGORY_CLASSES.blue.ink].join(' ');

/**
 * Below `lg` the sidebar becomes a horizontally scrollable pill row, so the main destinations
 * are always one tap away (requirements §13.4: never a hamburger-only app).
 */
export function MobileNavPills() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('shell.mainNav')}
      className="sticky top-0 z-10 -mx-4 mb-4 overflow-x-auto border-b border-border bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden"
    >
      <ul className="flex gap-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? PILL_ACTIVE : PILL)}
            >
              <LineIcon icon={item.icon} />
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
