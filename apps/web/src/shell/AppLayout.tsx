import { AppShell } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Text } from '@astryxdesign/core/Text';
import { TopNav } from '@astryxdesign/core/TopNav';
import { ColorModeToggle, LineIcon } from '@setubandh/ui';
import { CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router';
import { FullPageSpinner } from '../components/FullPageSpinner';
import { useWorkspace, WorkspaceProvider } from '../workspace/WorkspaceProvider';
import { CreateFirstWorkspace } from './CreateFirstWorkspace';
import { MobileNavPills } from './MobileNavPills';
import { NAV_ITEMS } from './nav';
import { NotificationsButton } from './NotificationsButton';
import { ProfileMenu } from './ProfileMenu';
import { UnverifiedBanner } from './UnverifiedBanner';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

/** The signed-in app (requirements §13.4): sidebar, top bar, mobile pill row, page outlet. */
export function AppLayout() {
  return (
    <WorkspaceProvider>
      <AppFrame />
    </WorkspaceProvider>
  );
}

function AppFrame() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { listStatus, workspaces, retry } = useWorkspace();

  if (listStatus === 'pending') return <FullPageSpinner />;
  if (listStatus === 'error') {
    return (
      <Center minHeight="100dvh" padding={4}>
        <EmptyState
          headingLevel={1}
          icon={<LineIcon icon={CloudOff} />}
          title={t('shell.loadFailed')}
          description={t('shell.loadFailedLead')}
          actions={<Button variant="primary" label={t('routeError.retry')} onClick={retry} />}
        />
      </Center>
    );
  }
  if (workspaces.length === 0) return <CreateFirstWorkspace />;

  const sideNav = (
    <SideNav header={<WorkspaceSwitcher />}>
      <SideNavSection title={t('shell.mainNav')} isHeaderHidden>
        {NAV_ITEMS.map((item) => (
          <SideNavItem
            key={item.to}
            href={item.to}
            label={t(item.labelKey)}
            icon={<LineIcon icon={item.icon} />}
            isSelected={item.isActive(pathname)}
          />
        ))}
      </SideNavSection>
      <SideNavSection title={t('shell.channels')}>
        <span className="block px-3 py-1">
          <Text color="secondary" size="sm">
            {t('shell.noChannels')}{' '}
            <Link
              to="/settings/channels"
              className="text-accent underline-offset-4 hover:underline"
            >
              {t('shell.connectChannel')}
            </Link>
          </Text>
        </span>
      </SideNavSection>
    </SideNav>
  );

  return (
    <AppShell
      height="fill"
      mobileNav={{ breakpoint: 'lg' }}
      banner={<UnverifiedBanner />}
      topNav={
        <TopNav
          label={t('shell.topBar')}
          heading={
            <Link
              to="/"
              className="font-mono text-sm font-semibold tracking-tight text-primary"
              aria-label={t('brand.home')}
            >
              {t('brand.name')}
            </Link>
          }
          endContent={
            <span className="flex items-center gap-1 sm:gap-2">
              <NotificationsButton />
              <ColorModeToggle isCompact />
              <ProfileMenu />
            </span>
          }
        />
      }
      sideNav={sideNav}
    >
      <span className="mx-auto block w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <MobileNavPills />
        <Outlet />
      </span>
    </AppShell>
  );
}
