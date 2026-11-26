import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupRequestSchema, type SignupRequest } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';
import { CheckInbox } from './CheckInbox';

export function SignupPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.signup.title'));
  const [error, setError] = useState<unknown>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<SignupRequest>({
    resolver: zodResolver(signupRequestSchema),
    defaultValues: { name: '', email: '', password: '', workspaceName: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      // The browser time zone prefills the workspace's country, currency and time zone (M1-09).
      await authApi.signup({
        ...values,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setSentTo(values.email);
    } catch (e) {
      if (e instanceof ApiError && e.fields.password)
        form.setError('password', { message: e.fields.password });
      else setError(e);
    }
  });

  if (sentTo) return <CheckInbox email={sentTo} reason="verify" />;

  return (
    <>
      <Stack gap={2}>
        <Heading level={1}>{t('auth.signup.title')}</Heading>
        <Text color="secondary">{t('auth.signup.lead')}</Text>
      </Stack>
      <FormError error={error} />
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <Stack gap={4}>
          <TextField
            control={form.control}
            name="name"
            label={t('fields.name')}
            autoComplete="name"
            hasAutoFocus
          />
          <TextField
            control={form.control}
            name="email"
            type="email"
            label={t('fields.workEmail')}
            autoComplete="email"
          />
          <TextField
            control={form.control}
            name="password"
            type="password"
            label={t('fields.password')}
            description={t('fields.passwordRules')}
            autoComplete="new-password"
          />
          <TextField
            control={form.control}
            name="workspaceName"
            label={t('fields.businessName')}
            autoComplete="organization"
          />
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('auth.signup.submit')}
            isLoading={form.formState.isSubmitting}
          />
        </Stack>
      </form>
      <Text color="secondary">
        {t('auth.signup.haveAccount')} <Link href="/login">{t('auth.signup.signIn')}</Link>
      </Text>
    </>
  );
}
