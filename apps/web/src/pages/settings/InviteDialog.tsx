import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Selector } from '@astryxdesign/core/Selector';
import { Stack } from '@astryxdesign/core/Stack';
import { useToast } from '@astryxdesign/core/Toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvitationRequestSchema, type CreateInvitationRequest } from '@setubandh/shared';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useInvite } from '../../api/settings';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';

/** Invite by email as Admin or Agent; the link is valid for 7 days (FR-AUTH-06). */
export function InviteDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const showToast = useToast();
  const invite = useInvite();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<CreateInvitationRequest>({
    resolver: zodResolver(createInvitationRequestSchema),
    defaultValues: { email: '', role: 'agent' },
  });
  const close = () => {
    form.reset();
    setError(null);
    onOpenChange(false);
  };
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await invite.mutateAsync(values);
      showToast({ body: t('settings.members.invited', { email: values.email }) });
      close();
    } catch (e) {
      setError(e);
    }
  });
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => (open ? onOpenChange(true) : close())}
      purpose="form"
      width={440}
    >
      <DialogHeader
        title={t('settings.members.inviteTitle')}
        subtitle={t('settings.members.inviteLead')}
        onOpenChange={(open) => (open ? undefined : close())}
      />
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="mt-5">
        <Stack gap={4}>
          <FormError error={error} />
          <TextField
            control={form.control}
            name="email"
            type="email"
            label={t('fields.email')}
            autoComplete="off"
            hasAutoFocus
          />
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Selector
                label={t('settings.members.role')}
                options={[
                  {
                    value: 'agent',
                    label: t('roles.agent'),
                    description: t('settings.members.agentHelp'),
                  },
                  {
                    value: 'admin',
                    label: t('roles.admin'),
                    description: t('settings.members.adminHelp'),
                  },
                ]}
                value={field.value}
                onChange={(value) => field.onChange(value ?? 'agent')}
              />
            )}
          />
          <Button
            type="submit"
            variant="primary"
            width="100%"
            label={t('settings.members.sendInvite')}
            isLoading={form.formState.isSubmitting}
          />
        </Stack>
      </form>
    </Dialog>
  );
}
