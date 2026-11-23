import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { ColorModeToggle } from '@setubandh/ui';

/** Placeholder shell on the shared theme. Admin screens arrive with M1-30. */
export function App() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-wider text-secondary uppercase">
            Platform
          </span>
          <Heading level={1}>Setubandh AI Admin</Heading>
          <Text color="secondary">Tenants, plans and channel health live here.</Text>
        </div>
        <ColorModeToggle />
      </header>
    </div>
  );
}
