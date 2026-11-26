import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useTranslation } from 'react-i18next';

/** A link without a token, or one the API rejected: say so and offer the way forward. */
export function LinkProblem({
  kind,
  message,
}: {
  kind: 'reset' | 'verify' | 'invite';
  message?: string;
}) {
  const { t } = useTranslation();
  return (
    <Stack gap={4} role="alert">
      <Heading level={1}>{t('auth.linkProblem.title')}</Heading>
      <Text color="secondary">{message ?? t(`auth.linkProblem.${kind}`)}</Text>
      {kind === 'reset' ? (
        <Button variant="primary" href="/forgot" label={t('auth.linkProblem.newReset')} />
      ) : null}
      {kind !== 'reset' ? <Button href="/login" label={t('auth.backToLogin')} /> : null}
    </Stack>
  );
}
