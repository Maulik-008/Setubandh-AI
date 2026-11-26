import { Button } from '@astryxdesign/core/Button';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { useToast } from '@astryxdesign/core/Toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { z, type MeResponse } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMe, useUpdateMe } from '../../api/settings';
import { useSession } from '../../auth/SessionProvider';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';
import { SettingsSection } from './SettingsSection';
import { TwoFactorSection } from './TwoFactorSection';

const profileSchema = z.object({ name: z.string().trim().min(1).max(120) });

/** My profile (FR-AUTH-11) and two-step sign-in (FR-AUTH-05). */
export function ProfileSettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('settings.tabs.profile'));
  const me = useMe();
  if (!me.data) {
    return (
      <SettingsSection title={t('settings.profile.title')}>
        <Skeleton height={80} />
      </SettingsSection>
    );
  }
  return (
    <Stack gap={6}>
      <ProfileForm me={me.data} />
      <TwoFactorSection enabled={me.data.twoFactorEnabled} />
    </Stack>
  );
}

function ProfileForm({ me }: { me: MeResponse }) {
  const { t } = useTranslation();
  const showToast = useToast();
  const update = useUpdateMe();
  const { updateUser } = useSession();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<{ name: string }>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: me.name },
  });
  const onSubmit = form.handleSubmit(async ({ name }) => {
    setError(null);
    try {
      const saved = await update.mutateAsync({ name });
      updateUser({ name: saved.name });
      form.reset({ name: saved.name });
      showToast({ body: t('settings.saved') });
    } catch (e) {
      setError(e);
    }
  });
  return (
    <SettingsSection
      title={t('settings.profile.title')}
      description={t('settings.profile.lead', { email: me.email })}
    >
      <FormError error={error} />
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex max-w-xl flex-col gap-5">
        <TextField
          control={form.control}
          name="name"
          label={t('fields.name')}
          autoComplete="name"
        />
        <span>
          <Button
            type="submit"
            variant="primary"
            label={t('settings.save')}
            isLoading={form.formState.isSubmitting}
          />
        </span>
      </form>
    </SettingsSection>
  );
}
