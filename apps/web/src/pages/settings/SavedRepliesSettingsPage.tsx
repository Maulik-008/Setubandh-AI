import { EmptyState } from '@astryxdesign/core/EmptyState';
import { LineIcon } from '@setubandh/ui';
import { MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../components/usePageTitle';
import { SettingsSection } from './SettingsSection';

/** Saved replies arrive with the composer (M1-21); until then, what this place will hold. */
export function SavedRepliesSettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('settings.tabs.saved-replies'));
  return (
    <SettingsSection
      title={t('settings.savedReplies.title')}
      description={t('settings.savedReplies.lead')}
    >
      <EmptyState
        headingLevel={3}
        icon={<LineIcon icon={MessageSquareText} />}
        title={t('settings.savedReplies.emptyTitle')}
        description={t('settings.savedReplies.emptyLead')}
      />
    </SettingsSection>
  );
}
