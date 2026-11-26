import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { ReactNode } from 'react';

/** A settings block: stacked surface-1 card with a title and a one-line explanation. */
export function SettingsSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card padding={6}>
      <Stack gap={5}>
        <Stack direction="horizontal" gap={4} justify="between" align="start" wrap="wrap">
          <Stack gap={1}>
            <Heading level={2}>{title}</Heading>
            {description ? <Text color="secondary">{description}</Text> : null}
          </Stack>
          {actions}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}
