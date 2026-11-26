import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { ColorModeToggle } from '@setubandh/ui';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

/**
 * Public auth screens: paper canvas, one centred card, marketing-size form padding
 * (requirements §13.4; no dark side panels on auth pages).
 */
export function AuthLayout() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh flex-col items-center bg-background px-4 py-6 sm:px-6">
      <header className="flex w-full max-w-5xl items-center justify-between">
        <Link href="/login" label={t('brand.home')}>
          <span className="font-mono text-sm font-semibold tracking-tight text-primary">
            {t('brand.name')}
          </span>
        </Link>
        <ColorModeToggle />
      </header>
      <section className="flex w-full flex-1 items-center justify-center py-10">
        <Card width="100%" maxWidth={440} padding={8}>
          <Stack gap={6}>
            <Outlet />
          </Stack>
        </Card>
      </section>
    </main>
  );
}
