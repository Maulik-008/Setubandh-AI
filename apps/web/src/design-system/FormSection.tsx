import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useState } from 'react';
import { DemoSection } from './DemoSection';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'gu', label: 'Gujarati' },
];

/** Inputs and selects: rest, helper text, error with the fix, disabled, loading. */
export function FormSection() {
  const [business, setBusiness] = useState('Kesari Threads');
  const [phone, setPhone] = useState('98450 11872');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<string | undefined>('en');

  return (
    <DemoSection
      eyebrow="Inputs"
      title="Fields say what to do next"
      description="Inputs are the one control that is not a pill. Errors name the fix."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextInput
          label="Business name"
          description="Customers see this name in every channel."
          value={business}
          onChange={setBusiness}
        />
        <TextInput
          label="WhatsApp number"
          type="tel"
          value={phone}
          onChange={setPhone}
          status={{ type: 'error', message: 'Add the country code, for example +91 98450 11872.' }}
        />
        <Selector
          label="Reply language"
          options={LANGUAGES}
          value={language}
          onChange={(value) => setLanguage(value ?? undefined)}
        />
        <TextInput
          label="Workspace ID"
          value="ws_kesari_threads"
          isDisabled
          disabledMessage="Set when the workspace was created."
        />
        <Selector label="Assign to" options={[]} placeholder="Loading teammates…" isLoading />
        <TextInput
          label="Search contacts"
          type="search"
          value={search}
          onChange={setSearch}
          placeholder="Name or number"
          startIcon="search"
        />
      </div>
    </DemoSection>
  );
}
