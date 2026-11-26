import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { useTranslation } from 'react-i18next';

/** Calm loader while the session is restored (decision 17). */
export function FullPageSpinner() {
  const { t } = useTranslation();
  return (
    <Center height="100dvh">
      <Spinner label={t('common.loading')} />
    </Center>
  );
}
