import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/auth';
import { useSession } from '../auth/SessionProvider';

/** Until the email is verified, channels cannot be connected (FR-AUTH-01): say so, offer a new link. */
export function UnverifiedBanner() {
  const { t } = useTranslation();
  const { state } = useSession();
  const [sent, setSent] = useState(false);
  if (state.status !== 'signedIn' || state.user.emailVerified) return null;
  return (
    <Banner
      status="warning"
      container="section"
      title={t('shell.unverified.title')}
      description={
        sent
          ? t('shell.unverified.sent', { email: state.user.email })
          : t('shell.unverified.description')
      }
      endContent={
        sent ? undefined : (
          <Button
            size="sm"
            label={t('shell.unverified.resend')}
            clickAction={async () => {
              await authApi.resendVerification(state.user.email).catch(() => undefined);
              setSent(true);
            }}
          />
        )
      }
    />
  );
}
