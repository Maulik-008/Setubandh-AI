import { ButtonsSection } from './ButtonsSection';
import { CategorySection } from './CategorySection';
import { ConversationsSection } from './ConversationsSection';
import { FormSection } from './FormSection';

/**
 * Design-system specimen page (M1-05): every core Astryx component in the
 * Paper & Pastel theme, in each of its states. It is the web home until the
 * real app shell lands; screenshot baselines guard its look in both modes.
 */
export function DesignSystemPage() {
  return (
    <div className="flex flex-col gap-6">
      <ButtonsSection />
      <FormSection />
      <CategorySection />
      <ConversationsSection />
    </div>
  );
}
