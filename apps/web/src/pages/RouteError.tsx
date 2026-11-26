import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { LineIcon } from '@setubandh/ui';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { NotFoundPage } from './NotFoundPage';

/** Error boundary for every route: plain words and a retry (requirements §13.2). */
export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <Center minHeight="100dvh" padding={4}>
      <EmptyState
        headingLevel={1}
        icon={<LineIcon icon={TriangleAlert} />}
        title={t('routeError.title')}
        description={t('routeError.description')}
        actions={
          <Button
            variant="primary"
            label={t('routeError.retry')}
            onClick={() => window.location.reload()}
          />
        }
      />
    </Center>
  );
}
