import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../components/usePageTitle';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';

/** A signed-in user with no workspace (left or removed from all of them) starts one here. */
export function CreateFirstWorkspace() {
  const { t } = useTranslation();
  usePageTitle(t('shell.createFirstTitle'));
  return (
    <Center minHeight="100dvh" padding={4}>
      <Card width="100%" maxWidth={440} padding={8}>
        <Stack gap={6}>
          <Stack gap={2}>
            <Heading level={1}>{t('shell.createFirstTitle')}</Heading>
            <Text color="secondary">{t('shell.createFirstLead')}</Text>
          </Stack>
          <CreateWorkspaceForm />
        </Stack>
      </Card>
    </Center>
  );
}
