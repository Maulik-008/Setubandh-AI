import type { CategoryHue } from '@setubandh/ui';

/** Specimen content for the design-system page only. Real data arrives with the inbox tickets. */

export type Channel = 'whatsapp' | 'instagram' | 'messenger';
export type Mode = 'ai' | 'human' | 'assist';

export const CHANNELS: { id: Channel; label: string; hue: CategoryHue }[] = [
  { id: 'whatsapp', label: 'WhatsApp', hue: 'emerald' },
  { id: 'instagram', label: 'Instagram', hue: 'coral' },
  { id: 'messenger', label: 'Messenger', hue: 'blue' },
];

/** Requirements §13.5: AI = violet, Human = teal, Assist = blue, always with a text label. */
export const MODES: Record<Mode, { label: string; hue: CategoryHue }> = {
  ai: { label: 'AI', hue: 'violet' },
  human: { label: 'Human', hue: 'teal' },
  assist: { label: 'Assist', hue: 'blue' },
};

// A type alias, not an interface: Astryx Table rows must be assignable to Record<string, unknown>.
export type ConversationRow = {
  id: string;
  contact: string;
  phone: string;
  channel: Channel;
  mode: Mode;
  updated: string;
};

export const CONVERSATIONS: ConversationRow[] = [
  {
    id: 'c1',
    contact: 'Ananya Rao',
    phone: '+91 98450 11872',
    channel: 'whatsapp',
    mode: 'ai',
    updated: '2 min ago',
  },
  {
    id: 'c2',
    contact: 'Vikram Shah',
    phone: '@vikram.shah',
    channel: 'instagram',
    mode: 'human',
    updated: '9 min ago',
  },
  {
    id: 'c3',
    contact: 'Meera Iyer',
    phone: 'Meera Iyer',
    channel: 'messenger',
    mode: 'assist',
    updated: '24 min ago',
  },
  {
    id: 'c4',
    contact: 'Rohan Das',
    phone: '+91 99001 22410',
    channel: 'whatsapp',
    mode: 'human',
    updated: '1 h ago',
  },
];
