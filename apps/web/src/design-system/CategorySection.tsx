import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import {
  CATEGORY_BADGE_VARIANT,
  CATEGORY_CLASSES,
  LineIcon,
  type CategoryHue,
} from '@setubandh/ui';
import {
  AlertTriangle,
  AtSign,
  Bot,
  CheckCircle2,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  UserRound,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { DemoSection } from './DemoSection';

/** Each hue means one thing; the meaning is always also written as text. */
const CATEGORIES: { hue: CategoryHue; label: string; meaning: string; icon: LucideIcon }[] = [
  { hue: 'emerald', label: 'WhatsApp', meaning: 'Channel', icon: MessageCircle },
  { hue: 'coral', label: 'Instagram', meaning: 'Channel', icon: AtSign },
  { hue: 'blue', label: 'Messenger', meaning: 'Channel', icon: MessagesSquare },
  { hue: 'violet', label: 'AI', meaning: 'Reply mode', icon: Bot },
  { hue: 'teal', label: 'Human', meaning: 'Reply mode', icon: UserRound },
  { hue: 'amber', label: 'New lead', meaning: 'Pipeline stage', icon: Sparkles },
];

/** Badges, pastel chips and tint cards: the six category hues and the status pills. */
export function CategorySection() {
  return (
    <DemoSection
      eyebrow="Badges and chips"
      title="Six hues, each with one meaning"
      description="Colour codes a category. Text or an icon always carries the meaning too."
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map(({ hue, label, meaning, icon }) => (
            <Card key={label} variant={CATEGORY_BADGE_VARIANT[hue]} padding={3}>
              <div className="flex flex-col items-start gap-3">
                <span
                  className={`grid size-9 place-items-center rounded-full bg-on-tint text-lg ${CATEGORY_CLASSES[hue].glyph}`}
                >
                  <LineIcon icon={icon} />
                </span>
                <div className="flex flex-col">
                  <Text weight="medium">{label}</Text>
                  <span className={`font-mono text-[11px] ${CATEGORY_CLASSES[hue].ink}`}>
                    {meaning}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" label="Connected" icon={<LineIcon icon={CheckCircle2} />} />
          <Badge
            variant="warning"
            label="Window closes in 2 h"
            icon={<LineIcon icon={AlertTriangle} />}
          />
          <Badge variant="error" label="Delivery failed" icon={<LineIcon icon={XCircle} />} />
          <Badge variant="neutral" label="Draft" />
          {CATEGORIES.slice(3, 5).map(({ hue, label }) => (
            <Badge key={label} variant={CATEGORY_BADGE_VARIANT[hue]} label={label} />
          ))}
        </div>
      </div>
    </DemoSection>
  );
}
