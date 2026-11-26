import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Center } from '@astryxdesign/core/Center';
import { LineIcon } from '@setubandh/ui';
import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../components/usePageTitle';

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle(t('notFound.title'));
  return (
    <Center minHeight="100dvh" padding={4}>
      <EmptyState
        headingLevel={1}
        icon={<LineIcon icon={Compass} />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        actions={<Button variant="primary" href="/" label={t('notFound.home')} />}
      />
    </Center>
  );
}
