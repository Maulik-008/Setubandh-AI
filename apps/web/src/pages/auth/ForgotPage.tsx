import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailOnlyRequestSchema } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';
import { CheckInbox } from './CheckInbox';

export function ForgotPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.forgot.title'));
  const [error, setError] = useState<unknown>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(emailOnlyRequestSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSentTo(email);
    } catch (e) {
      setError(e);
    }
  });

  if (sentTo) return <CheckInbox email={sentTo} reason="reset" />;
  return (
    <>
      <Stack gap={2}>
        <Heading level={1}>{t('auth.forgot.title')}</Heading>
        <Text color="secondary">{t('auth.forgot.lead')}</Text>
      </Stack>
      <FormError error={error} />
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <Stack gap={4}>
          <TextField
            control={form.control}
            name="email"
            type="email"
            label={t('fields.email')}
            autoComplete="email"
            hasAutoFocus
          />
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('auth.forgot.submit')}
            isLoading={form.formState.isSubmitting}
          />
        </Stack>
      </form>
      <Link href="/login">{t('auth.backToLogin')}</Link>
    </>
  );
}
