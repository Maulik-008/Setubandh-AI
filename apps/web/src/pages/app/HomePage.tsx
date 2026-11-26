import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { LineIcon } from '@setubandh/ui';
import { MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../components/usePageTitle';

/** Home (plan §4.3). Its checklist and numbers arrive with M1-28; until then a first-run state. */
export function HomePage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.home'));
  return (
    <Stack gap={6}>
      <Heading level={1}>{t('nav.home')}</Heading>
      <EmptyState
        headingLevel={2}
        icon={<LineIcon icon={MessagesSquare} />}
        title={t('home.empty.title')}
        description={t('home.empty.description')}
        actions={
          <Button variant="primary" href="/settings/members" label={t('home.empty.invite')} />
        }
      />
    </Stack>
  );
}
