import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailOnlyRequestSchema } from '@setubandh/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useSession } from '../../auth/SessionProvider';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';
import { CheckInbox } from './CheckInbox';

// A verify link is single use: StrictMode and remounts must not send it twice.
const attempts = new Map<string, Promise<void>>();
const verifyOnce = (token: string) => {
  let attempt = attempts.get(token);
  if (!attempt) {
    attempt = authApi.verifyEmail(token).then(() => undefined);
    attempts.set(token, attempt);
  }
  return attempt;
};

type Status = 'verifying' | 'verified' | 'failed';

export function VerifyPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.verify.title'));
  const token = useSearchParams()[0].get('token');
  const { state, updateUser } = useSession();
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'failed');
  const [message, setMessage] = useState<string | null>(null);
  const [resentTo, setResentTo] = useState<string | null>(null);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(emailOnlyRequestSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!token) return;
    verifyOnce(token).then(
      () => setStatus('verified'),
      (e: unknown) => {
        setMessage(e instanceof ApiError ? e.message : null);
        setStatus('failed');
      },
    );
  }, [token]);

  useEffect(() => {
    if (status === 'verified' && state.status === 'signedIn') updateUser({ emailVerified: true });
  }, [status, state.status, updateUser]);

  const onResend = form.handleSubmit(async ({ email }) => {
    await authApi.resendVerification(email).catch(() => undefined);
    setResentTo(email);
  });

  if (resentTo) return <CheckInbox email={resentTo} reason="verify" />;
  if (status === 'verifying') {
    return (
      <Stack gap={4} role="status">
        <Heading level={1}>{t('auth.verify.title')}</Heading>
        <Spinner label={t('auth.verify.checking')} />
      </Stack>
    );
  }
  if (status === 'verified') {
    return (
      <Stack gap={4} role="status">
        <Heading level={1}>{t('auth.verify.doneTitle')}</Heading>
        <Text color="secondary">{t('auth.verify.done')}</Text>
        <Button variant="primary" href="/" label={t('auth.verify.continue')} />
      </Stack>
    );
  }
  return (
    <>
      <Stack gap={2}>
        <Heading level={1}>{t('auth.linkProblem.title')}</Heading>
        <Text color="secondary">{message ?? t('auth.linkProblem.verify')}</Text>
      </Stack>
      <form onSubmit={(e) => void onResend(e)} noValidate>
        <Stack gap={4}>
          <TextField
            control={form.control}
            name="email"
            type="email"
            label={t('fields.email')}
            autoComplete="email"
          />
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('auth.verify.resend')}
            isLoading={form.formState.isSubmitting}
          />
        </Stack>
      </form>
    </>
  );
}
