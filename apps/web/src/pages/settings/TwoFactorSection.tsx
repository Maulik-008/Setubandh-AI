import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  passwordConfirmRequestSchema,
  twoFactorEnableRequestSchema,
  type TwoFactorSetupResponse,
} from '@setubandh/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/client';
import { ME_KEY, twoFactorApi } from '../../api/settings';
import { FormError } from '../../components/FormError';
import { TextField } from '../../components/TextField';
import { SettingsSection } from './SettingsSection';

type Step =
  | { kind: 'idle' }
  | { kind: 'setup'; setup: TwoFactorSetupResponse }
  | { kind: 'codes'; codes: string[] };

/** Two-step sign-in (FR-AUTH-05): set up with an authenticator app, recovery codes shown once, turn off with the password. */
export function TwoFactorSection({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [error, setError] = useState<unknown>(null);
  const refreshMe = () => queryClient.invalidateQueries({ queryKey: ME_KEY });

  const start = async () => {
    setError(null);
    try {
      setStep({ kind: 'setup', setup: await twoFactorApi.setup() });
    } catch (e) {
      setError(e);
    }
  };

  return (
    <SettingsSection
      title={t('settings.twoFactor.title')}
      description={t(enabled ? 'settings.twoFactor.onLead' : 'settings.twoFactor.offLead')}
      actions={
        <Text weight="semibold" color={enabled ? 'accent' : 'secondary'}>
          {t(enabled ? 'settings.twoFactor.on' : 'settings.twoFactor.off')}
        </Text>
      }
    >
      <FormError error={error} />
      {step.kind === 'codes' ? (
        <RecoveryCodes codes={step.codes} onDone={() => setStep({ kind: 'idle' })} />
      ) : step.kind === 'setup' ? (
        <SetupStep
          setup={step.setup}
          onEnabled={async (codes) => {
            await refreshMe();
            setStep({ kind: 'codes', codes });
          }}
          onCancel={() => setStep({ kind: 'idle' })}
        />
      ) : enabled ? (
        <DisableForm onDisabled={refreshMe} />
      ) : (
        <span>
          <Button label={t('settings.twoFactor.turnOn')} clickAction={start} />
        </span>
      )}
    </SettingsSection>
  );
}

function SetupStep({
  setup,
  onEnabled,
  onCancel,
}: {
  setup: TwoFactorSetupResponse;
  onEnabled: (codes: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm<{ code: string }>({
    resolver: zodResolver(twoFactorEnableRequestSchema),
    defaultValues: { code: '' },
  });
  const onSubmit = form.handleSubmit(async ({ code }) => {
    try {
      const { recoveryCodes } = await twoFactorApi.enable(code);
      await onEnabled(recoveryCodes);
    } catch (e) {
      form.setError('code', {
        message: e instanceof ApiError ? e.message : t('common.unexpectedError'),
      });
    }
  });
  // The QR is an SVG made by our API, so the secret never reaches a third-party QR service.
  const qr = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrSvg)}`;
  return (
    <Stack gap={5}>
      <Text>{t('settings.twoFactor.scan')}</Text>
      <img
        src={qr}
        alt={t('settings.twoFactor.qrAlt')}
        width={176}
        height={176}
        className="rounded-[18px] border border-border bg-background p-2"
      />
      <Stack gap={1}>
        <Text color="secondary" size="sm">
          {t('settings.twoFactor.manual')}
        </Text>
        <code className="break-all rounded-[10px] bg-surface-2 px-3 py-2 font-mono text-sm tracking-wider">
          {setup.secret}
        </code>
      </Stack>
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex max-w-sm flex-col gap-4">
        <TextField
          control={form.control}
          name="code"
          label={t('fields.authCode')}
          autoComplete="one-time-code"
          inputMode="numeric"
        />
        <span className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            label={t('settings.twoFactor.confirm')}
            isLoading={form.formState.isSubmitting}
          />
          <Button variant="ghost" label={t('common.cancel')} onClick={onCancel} />
        </span>
      </form>
    </Stack>
  );
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { t } = useTranslation();
  const showToast = useToast();
  const text = codes.join('\n');
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([`${t('settings.twoFactor.fileHeader')}\n\n${text}\n`], { type: 'text/plain' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'setubandh-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Stack gap={4}>
      <Banner
        status="success"
        title={t('settings.twoFactor.enabled')}
        description={t('settings.twoFactor.codesLead')}
      />
      <ul
        aria-label={t('settings.twoFactor.codesLabel')}
        className="grid max-w-md grid-cols-2 gap-2"
      >
        {codes.map((code) => (
          <li
            key={code}
            className="rounded-[10px] bg-surface-2 px-3 py-2 text-center font-mono text-sm tracking-wider"
          >
            {code}
          </li>
        ))}
      </ul>
      <span className="flex flex-wrap gap-2">
        <Button
          label={t('settings.twoFactor.copy')}
          clickAction={async () => {
            await navigator.clipboard.writeText(text);
            showToast({ body: t('settings.twoFactor.copied') });
          }}
        />
        <Button label={t('settings.twoFactor.download')} onClick={download} />
        <Button variant="primary" label={t('settings.twoFactor.saved')} onClick={onDone} />
      </span>
    </Stack>
  );
}

function DisableForm({ onDisabled }: { onDisabled: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const showToast = useToast();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<{ password: string }>({
    resolver: zodResolver(passwordConfirmRequestSchema),
    defaultValues: { password: '' },
  });
  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await twoFactorApi.disable(password);
      await onDisabled();
      showToast({ body: t('settings.twoFactor.turnedOff') });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401)
        form.setError('password', { message: t('settings.twoFactor.wrongPassword') });
      else setError(e);
    }
  });
  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex max-w-sm flex-col gap-4">
      <FormError error={error} />
      <TextField
        control={form.control}
        name="password"
        type="password"
        label={t('settings.twoFactor.passwordToTurnOff')}
        autoComplete="current-password"
      />
      <span>
        <Button
          type="submit"
          variant="destructive"
          label={t('settings.twoFactor.turnOff')}
          isLoading={form.formState.isSubmitting}
        />
      </span>
    </form>
  );
}
