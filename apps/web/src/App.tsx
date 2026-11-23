import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { ColorModeToggle } from '@setubandh/ui';
import { ApiStatus } from './components/ApiStatus';
import { DesignSystemPage } from './design-system/DesignSystemPage';

/** Web shell. Navigation and the inbox layout arrive with their tickets; until then it hosts the design-system page. */
export function App() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-wider text-secondary uppercase">
            Design system
          </span>
          <Heading level={1}>Setubandh AI</Heading>
          <Text color="secondary">One inbox for WhatsApp, Instagram and Messenger.</Text>
          <ApiStatus />
        </div>
        <ColorModeToggle />
      </header>
      <main>
        <DesignSystemPage />
      </main>
    </div>
  );
}
