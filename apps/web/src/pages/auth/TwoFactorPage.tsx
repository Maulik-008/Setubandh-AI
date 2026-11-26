import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { authApi } from '../../api/auth';
import { useSession } from '../../auth/SessionProvider';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';

const codeForm = z.object({
  value: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: 'Enter the 6-digit code from your app.' }),
});
const recoveryForm = z.object({
  value: z.string().trim().min(10, { error: 'Enter one of your recovery codes.' }).max(20),
});

/** Second step of sign-in (FR-AUTH-05). The challenge is single use: a wrong answer means signing in again. */
export function TwoFactorPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.twoFactor.title'));
  const { signIn } = useSession();
  const navigate = useNavigate();
  const state = useLocation().state as { challengeToken?: string; next?: string } | null;
  const [useRecovery, setUseRecovery] = useState(false);
  const form = useForm<{ value: string }>({
    resolver: zodResolver(useRecovery ? recoveryForm : codeForm),
    defaultValues: { value: '' },
  });

  if (!state?.challengeToken) return <Navigate to="/login" replace />;
  const challengeToken = state.challengeToken;

  const onSubmit = form.handleSubmit(async ({ value }) => {
    try {
      const session = await authApi.loginWithSecondFactor(
        useRecovery ? { challengeToken, recoveryCode: value } : { challengeToken, code: value },
      );
      signIn(session);
      await navigate(state.next ?? '/', { replace: true });
    } catch {
      await navigate('/login', { replace: true, state: { notice: t('auth.twoFactor.failed') } });
    }
  });

  return (
    <>
      <Stack gap={2}>
        <Heading level={1}>{t('auth.twoFactor.title')}</Heading>
        <Text color="secondary">
          {t(useRecovery ? 'auth.twoFactor.leadRecovery' : 'auth.twoFactor.lead')}
        </Text>
      </Stack>
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <Stack gap={4}>
          <TextField
            key={useRecovery ? 'recovery' : 'code'}
            control={form.control}
            name="value"
            label={t(useRecovery ? 'fields.recoveryCode' : 'fields.authCode')}
            autoComplete={useRecovery ? 'off' : 'one-time-code'}
            inputMode={useRecovery ? 'text' : 'numeric'}
            hasAutoFocus
          />
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('auth.twoFactor.submit')}
            isLoading={form.formState.isSubmitting}
          />
          <Button
            variant="ghost"
            label={t(useRecovery ? 'auth.twoFactor.useCode' : 'auth.twoFactor.useRecovery')}
            onClick={() => {
              setUseRecovery((v) => !v);
              form.reset({ value: '' });
            }}
          />
        </Stack>
      </form>
    </>
  );
}
