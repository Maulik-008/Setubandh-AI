import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkspaceRequestSchema, type CreateWorkspaceRequest } from '@setubandh/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormError } from '../components/FormError';
import { TextField } from '../components/TextField';
import { useWorkspace } from '../workspace/WorkspaceProvider';

/** Name a new workspace; I become its Owner (at most 3 owned, the API enforces it). */
export function CreateWorkspaceForm({ onCreated }: { onCreated?: () => void }) {
  const { t } = useTranslation();
  const { create } = useWorkspace();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<CreateWorkspaceRequest>({
    resolver: zodResolver(createWorkspaceRequestSchema),
    defaultValues: { name: '' },
  });
  const onSubmit = form.handleSubmit(async ({ name }) => {
    setError(null);
    try {
      await create({ name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      onCreated?.();
    } catch (e) {
      setError(e);
    }
  });
  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate>
      <Stack gap={4}>
        <FormError error={error} />
        <TextField
          control={form.control}
          name="name"
          label={t('fields.businessName')}
          autoComplete="organization"
          hasAutoFocus
        />
        <Button
          type="submit"
          variant="primary"
          width="100%"
          label={t('shell.createWorkspace')}
          isLoading={form.formState.isSubmitting}
        />
      </Stack>
    </form>
  );
}
