import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema, z } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useSession } from '../../auth/SessionProvider';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';
import { LinkProblem } from './LinkProblem';

const resetForm = z.object({ password: passwordSchema });

export function ResetPage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.reset.title'));
  const token = useSearchParams()[0].get('token');
  const { state, signOut } = useSession();
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const form = useForm<{ password: string }>({
    resolver: zodResolver(resetForm),
    defaultValues: { password: '' },
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await authApi.resetPassword(token ?? '', password);
      // A reset signs out every device, this one included.
      if (state.status === 'signedIn') await signOut();
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.fields.password)
        form.setError('password', { message: e.fields.password });
      else setError(e);
    }
  });

  if (!token) return <LinkProblem kind="reset" />;
  if (done) {
    return (
      <Stack gap={4} role="status">
        <Heading level={1}>{t('auth.reset.doneTitle')}</Heading>
        <Text color="secondary">{t('auth.reset.done')}</Text>
        <Button variant="primary" href="/login" label={t('auth.reset.signIn')} />
      </Stack>
    );
  }
  return (
    <>
      <Stack gap={2}>
        <Heading level={1}>{t('auth.reset.title')}</Heading>
        <Text color="secondary">{t('auth.reset.lead')}</Text>
      </Stack>
      <FormError error={error} />
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <Stack gap={4}>
          <TextField
            control={form.control}
            name="password"
            type="password"
            label={t('fields.newPassword')}
            description={t('fields.passwordRules')}
            autoComplete="new-password"
            hasAutoFocus
          />
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('auth.reset.submit')}
            isLoading={form.formState.isSubmitting}
          />
        </Stack>
      </form>
    </>
  );
}
