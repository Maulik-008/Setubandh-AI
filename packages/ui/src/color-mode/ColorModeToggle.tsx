import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Monitor, Moon, Sun } from 'lucide-react';
import { LineIcon } from '../LineIcon';
import { useColorMode } from './AppTheme';
import { COLOR_MODES, type ColorMode } from './storage';

const OPTIONS: Record<ColorMode, { label: string; Icon: typeof Sun }> = {
  light: { label: 'Light', Icon: Sun },
  dark: { label: 'Dark', Icon: Moon },
  system: { label: 'System', Icon: Monitor },
};

function isColorMode(value: string): value is ColorMode {
  return (COLOR_MODES as readonly string[]).includes(value);
}

/** Light / dark / system switch (a radio group). Drives Astryx `<Theme mode>` through `<AppTheme>`. */
export function ColorModeToggle({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { mode, setMode } = useColorMode();
  return (
    <SegmentedControl
      label="Colour mode"
      size={size}
      value={mode}
      onChange={(value) => {
        if (isColorMode(value)) setMode(value);
      }}
    >
      {COLOR_MODES.map((value) => {
        const { label, Icon } = OPTIONS[value];
        return (
          <SegmentedControlItem
            key={value}
            value={value}
            label={label}
            icon={<LineIcon icon={Icon} />}
          />
        );
      })}
    </SegmentedControl>
  );
}
