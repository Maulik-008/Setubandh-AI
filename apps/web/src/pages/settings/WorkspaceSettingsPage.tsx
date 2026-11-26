import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateWorkspaceRequestSchema, z, type WorkspaceResponse } from '@setubandh/shared';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useUpdateWorkspace } from '../../api/settings';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { usePageTitle } from '../../components/usePageTitle';
import { useCan, useWorkspace } from '../../workspace/WorkspaceProvider';
import { SettingsSection } from './SettingsSection';

const SUPPORTED_ZONES = Intl.supportedValuesOf('timeZone');
/**
 * Browsers list some zones under older names (Chromium: Asia/Calcutta for Asia/Kolkata), so the
 * saved zone is always offered even when the browser's list names it differently.
 */
const timeZoneOptions = (saved: string) =>
  SUPPORTED_ZONES.includes(saved) ? SUPPORTED_ZONES : [saved, ...SUPPORTED_ZONES];
const formSchema = updateWorkspaceRequestSchema.required();
type FormValues = z.infer<typeof formSchema>;

/** Workspace profile (plan §4.1): name, time zone, and "Agents can see all conversations". */
export function WorkspaceSettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('settings.tabs.workspace'));
  const { current } = useWorkspace();
  if (!current) {
    return (
      <SettingsSection title={t('settings.workspace.title')}>
        <Stack gap={3}>
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      </SettingsSection>
    );
  }
  return <WorkspaceForm key={current.id} workspace={current} />;
}

function WorkspaceForm({ workspace }: { workspace: WorkspaceResponse }) {
  const { t } = useTranslation();
  const canEdit = useCan('workspace.settings');
  const showToast = useToast();
  const update = useUpdateWorkspace();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: workspace.name,
      timezone: workspace.timezone,
      agentsSeeAllConversations: workspace.agentsSeeAllConversations,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const saved = await update.mutateAsync(values);
      form.reset({
        name: saved.name,
        timezone: saved.timezone,
        agentsSeeAllConversations: saved.agentsSeeAllConversations,
      });
      showToast({ body: t('settings.saved') });
    } catch (e) {
      setError(e);
    }
  });

  return (
    <SettingsSection
      title={t('settings.workspace.title')}
      description={t('settings.workspace.lead')}
    >
      {!canEdit ? <Banner status="info" title={t('settings.workspace.readOnly')} /> : null}
      <FormError error={error} />
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <fieldset disabled={!canEdit} className="flex max-w-xl flex-col gap-5">
          <TextField
            control={form.control}
            name="name"
            label={t('fields.businessName')}
            autoComplete="organization"
          />
          <Controller
            control={form.control}
            name="timezone"
            render={({ field, fieldState }) => (
              <Selector
                label={t('settings.workspace.timezone')}
                description={t('settings.workspace.timezoneHelp')}
                options={timeZoneOptions(workspace.timezone)}
                value={field.value}
                onChange={(value) => field.onChange(value ?? '')}
                hasSearch
                searchPlaceholder={t('settings.workspace.searchTimezone')}
                isDisabled={!canEdit}
                status={
                  fieldState.error
                    ? { type: 'error', message: fieldState.error.message }
                    : undefined
                }
              />
            )}
          />
          <Controller
            control={form.control}
            name="agentsSeeAllConversations"
            render={({ field }) => (
              <Switch
                label={t('settings.workspace.agentsSeeAll')}
                description={t('settings.workspace.agentsSeeAllHelp')}
                value={field.value}
                onChange={(checked) => field.onChange(checked)}
                isDisabled={!canEdit}
              />
            )}
          />
          <Text color="secondary" size="sm">
            {t('settings.workspace.region', {
              country: workspace.country,
              currency: workspace.currency,
            })}
          </Text>
          {canEdit ? (
            <span>
              <Button
                type="submit"
                variant="primary"
                label={t('settings.save')}
                isLoading={form.formState.isSubmitting}
              />
            </span>
          ) : null}
        </fieldset>
      </form>
    </SettingsSection>
  );
}
