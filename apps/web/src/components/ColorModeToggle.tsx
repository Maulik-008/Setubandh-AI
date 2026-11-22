import { useEffect, useState } from 'react';
import { applyMode, readStoredMode, storeMode, type ColorMode } from './color-mode';

const OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Light / dark / system switch. Placeholder until Astryx `Theme` owns colour mode (ADR-08, M1-05). */
export function ColorModeToggle() {
  const [mode, setMode] = useState<ColorMode>(readStoredMode);

  useEffect(() => {
    applyMode(mode);
    storeMode(mode);
    if (mode !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyMode('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode]);

  return (
    <fieldset>
      <legend>Colour mode</legend>
      {OPTIONS.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name="color-mode"
            value={option.value}
            checked={mode === option.value}
            onChange={() => setMode(option.value)}
          />{' '}
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
