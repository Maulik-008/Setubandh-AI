import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { useId, type ReactNode } from 'react';

/** One block of the design-system page: mono eyebrow, title, one line of context, then the specimens. */
export function DemoSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <header className="mb-5 flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-wider text-secondary uppercase">
            {eyebrow}
          </span>
          <Heading level={2} id={headingId} textWrap="balance">
            {title}
          </Heading>
          <Text color="secondary" textWrap="pretty">
            {description}
          </Text>
        </header>
        {children}
      </Card>
    </section>
  );
}
