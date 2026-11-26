import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Popover } from '@astryxdesign/core/Popover';
import { LineIcon } from '@setubandh/ui';
import { Bell, BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Notifications bell. The notification centre arrives with M1-29; until then an honest empty state. */
export function NotificationsButton() {
  const { t } = useTranslation();
  return (
    <Popover
      label={t('shell.notifications')}
      alignment="end"
      width={300}
      content={
        <EmptyState
          isCompact
          headingLevel={2}
          icon={<LineIcon icon={BellOff} />}
          title={t('shell.noNotifications')}
          description={t('shell.noNotificationsLead')}
        />
      }
    >
      <Button
        variant="ghost"
        isIconOnly
        label={t('shell.notifications')}
        icon={<LineIcon icon={Bell} />}
      />
    </Popover>
  );
}
