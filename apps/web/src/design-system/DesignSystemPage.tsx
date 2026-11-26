import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { ColorModeToggle } from '@setubandh/ui';
import { usePageTitle } from '../components/usePageTitle';
import { ButtonsSection } from './ButtonsSection';
import { CategorySection } from './CategorySection';
import { ConversationsSection } from './ConversationsSection';
import { FormSection } from './FormSection';

/**
 * Design-system specimen page (M1-05): every core Astryx component in the Paper & Pastel theme,
 * in each of its states. Served at /dev/design-system in development and e2e builds only;
 * screenshot baselines guard its look in both modes.
 */
export function DesignSystemPage() {
  usePageTitle('Design system');
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-wider text-secondary uppercase">
            Design system
          </span>
          <Heading level={1}>Setubandh AI</Heading>
          <Text color="secondary">One inbox for WhatsApp, Instagram and Messenger.</Text>
        </div>
        <ColorModeToggle />
      </header>
      <main className="flex flex-col gap-6">
        <ButtonsSection />
        <FormSection />
        <CategorySection />
        <ConversationsSection />
      </main>
    </div>
  );
}
