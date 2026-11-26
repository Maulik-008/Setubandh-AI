import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { authApi, isMfaChallenge } from '../../api/auth';
import { ApiError } from '../../api/client';
import { safeNext } from '../../auth/guards';
import { useSession } from '../../auth/SessionProvider';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';

export function LoginPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.login.title'));
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const next = safeNext(params.get('next'));
  const [error, setError] = useState<unknown>(null);
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await authApi.login(values);
      if (isMfaChallenge(result)) {
        await navigate('/2fa', { state: { challengeToken: result.challengeToken, next } });
        return;
      }
      signIn(result);
      await navigate(next, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'TOO_MANY_ATTEMPTS') {
        const seconds = Number(e.details?.retryAfterSeconds ?? 900);
        setError(
          new ApiError(
            e.code,
            t('auth.login.locked', { minutes: Math.ceil(seconds / 60) }),
            e.status,
          ),
        );
      } else setError(e);
    }
  });

  return (
    <>
      <Stack gap={2}>
        <Heading level={1}>{t('auth.login.title')}</Heading>
        <Text color="secondary">{t('auth.login.lead')}</Text>
      </Stack>
      {notice ? <Banner status="info" title={notice} /> : null}
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
          <TextField
            control={form.control}
            name="password"
            type="password"
            label={t('fields.password')}
            autoComplete="current-password"
          />
          <Link href="/forgot">{t('auth.login.forgot')}</Link>
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('auth.login.submit')}
            isLoading={form.formState.isSubmitting}
          />
        </Stack>
      </form>
      <Text color="secondary">
        {t('auth.login.noAccount')} <Link href="/signup">{t('auth.login.createAccount')}</Link>
      </Text>
    </>
  );
}
