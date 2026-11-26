import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { LineIcon } from '@setubandh/ui';
import { MailCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Confirmation after signup, resend or forgot password. Never says whether the account exists. */
export function CheckInbox({ email, reason }: { email: string; reason: 'verify' | 'reset' }) {
  const { t } = useTranslation();
  return (
    <Stack gap={4} role="status">
      <span className="flex size-12 items-center justify-center rounded-full bg-chip-emerald/10 text-xl text-chip-emerald">
        <LineIcon icon={MailCheck} />
      </span>
      <Heading level={1}>{t('auth.checkInbox.title')}</Heading>
      <Text color="secondary">
        {t(reason === 'verify' ? 'auth.checkInbox.verify' : 'auth.checkInbox.reset', { email })}
      </Text>
      <Button href="/login" label={t('auth.checkInbox.backToLogin')} />
    </Stack>
  );
}
