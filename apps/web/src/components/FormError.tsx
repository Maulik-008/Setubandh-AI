import { Banner } from '@astryxdesign/core/Banner';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';

/** The API's plain-language message for a failed form submit, announced to screen readers. */
export function FormError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : t('common.unexpectedError');
  return (
    <div role="alert" data-form-error>
      <Banner status="error" title={message} />
    </div>
  );
}
