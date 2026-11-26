import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router';

export const SETTINGS_SECTIONS = [
  'workspace',
  'members',
  'channels',
  'saved-replies',
  'profile',
] as const;

/** Settings: one URL per tab (/settings/<section>), so links and browser back work. */
export function SettingsLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const section = useLocation().pathname.split('/')[2] ?? 'workspace';
  return (
    <Stack gap={6}>
      <Heading level={1}>{t('nav.settings')}</Heading>
      <TabList
        value={section}
        onChange={(value) => void navigate(`/settings/${value}`)}
        hasDivider
        overflow="scroll"
      >
        {SETTINGS_SECTIONS.map((s) => (
          <Tab key={s} value={s} label={t(`settings.tabs.${s}`)} href={`/settings/${s}`} />
        ))}
      </TabList>
      <Outlet />
    </Stack>
  );
}
