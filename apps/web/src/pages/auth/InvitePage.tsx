import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema, z } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useSession } from '../../auth/SessionProvider';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';
import { LinkProblem } from './LinkProblem';

const newAccountForm = z.object({
  name: z.string().trim().min(1).max(120),
  password: passwordSchema,
});

/**
 * Accepting an invitation (FR-AUTH-06): a signed-in user joins with one click (the invite must be
 * for their email); someone new creates their account here, already verified by the link.
 */
export function InvitePage() {
  const { t } = useTranslation();
  usePageTitle(t('auth.invite.title'));
  const token = useSearchParams()[0].get('token');
  const { state, signIn, signOut } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [joining, setJoining] = useState(false);
  const form = useForm<{ name: string; password: string }>({
    resolver: zodResolver(newAccountForm),
    defaultValues: { name: '', password: '' },
  });

  if (!token) return <LinkProblem kind="invite" />;
  const here = `/invite?token=${encodeURIComponent(token)}`;

  const join = async () => {
    setError(null);
    setJoining(true);
    try {
      await authApi.acceptInvite(token);
      await navigate('/', { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setJoining(false);
    }
  };

  const onCreate = form.handleSubmit(async (values) => {
    setError(null);
    try {
      signIn(await authApi.acceptInviteNewAccount({ token, ...values }));
      await navigate('/', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.fields.password)
        form.setError('password', { message: e.fields.password });
      else setError(e);
    }
  });

  const header = (
    <Stack gap={2}>
      <Heading level={1}>{t('auth.invite.title')}</Heading>
      <Text color="secondary">{t('auth.invite.lead')}</Text>
    </Stack>
  );

  if (state.status === 'signedIn') {
    return (
      <>
        {header}
        <Text>{t('auth.invite.signedInAs', { email: state.user.email })}</Text>
        <FormError error={error} />
        {error ? (
          <Stack gap={3}>
            <Text color="secondary">{t('auth.invite.otherEmail')}</Text>
            <Button
              label={t('auth.invite.switchAccount')}
              onClick={() =>
                void signOut().then(() => navigate(`/login?next=${encodeURIComponent(here)}`))
              }
            />
          </Stack>
        ) : null}
        <Button
          variant="primary"
          width="100%"
          label={t('auth.invite.join')}
          isLoading={joining}
          onClick={() => void join()}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <FormError error={error} />
      <form onSubmit={(e) => void onCreate(e)} noValidate>
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
            name="password"
            type="password"
            label={t('fields.choosePassword')}
            description={t('fields.passwordRules')}
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('auth.invite.create')}
            isLoading={form.formState.isSubmitting}
          />
        </Stack>
      </form>
      <Text color="secondary">
        {t('auth.invite.haveAccount')}{' '}
        <Link href={`/login?next=${encodeURIComponent(here)}`}>
          {t('auth.invite.signInToJoin')}
        </Link>
      </Text>
    </>
  );
}
