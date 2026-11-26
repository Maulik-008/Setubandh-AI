import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { LineIcon } from '@setubandh/ui';
import { Radio } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../auth/SessionProvider';
import { usePageTitle } from '../../components/usePageTitle';
import { SettingsSection } from './SettingsSection';

/** Channels (plan §4.2). Connecting arrives with M1-16 / M1-24; this is the designed empty state. */
export function ChannelsSettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('settings.tabs.channels'));
  const { state } = useSession();
  const unverified = state.status === 'signedIn' && !state.user.emailVerified;
  return (
    <SettingsSection title={t('settings.channels.title')} description={t('settings.channels.lead')}>
      <EmptyState
        headingLevel={3}
        icon={<LineIcon icon={Radio} />}
        title={t('settings.channels.emptyTitle')}
        description={
          unverified ? t('settings.channels.verifyFirst') : t('settings.channels.comingSoon')
        }
        actions={
          <Button
            variant="primary"
            label={t('settings.channels.connectWhatsApp')}
            isDisabled
            tooltip={
              unverified ? t('settings.channels.verifyFirst') : t('settings.channels.comingSoon')
            }
          />
        }
      />
    </SettingsSection>
  );
}
