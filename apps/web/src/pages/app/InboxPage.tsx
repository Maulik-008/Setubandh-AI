import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { LineIcon } from '@setubandh/ui';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../components/usePageTitle';

/** Inbox (plan §4.4). The three-pane inbox arrives with M1-20. */
export function InboxPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.inbox'));
  return (
    <Stack gap={6}>
      <Heading level={1}>{t('nav.inbox')}</Heading>
      <EmptyState
        headingLevel={2}
        icon={<LineIcon icon={Inbox} />}
        title={t('inbox.empty.title')}
        description={t('inbox.empty.description')}
        actions={
          <Button variant="primary" href="/settings/channels" label={t('inbox.empty.channels')} />
        }
      />
    </Stack>
  );
}
