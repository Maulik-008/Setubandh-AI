import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { LineIcon } from '@setubandh/ui';
import { BookOpen, MoreHorizontal, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AddChannelDialog } from './AddChannelDialog';
import { DemoSection } from './DemoSection';

/** Buttons: the one ink pill, outline, ghost and destructive outline, plus their states. */
export function ButtonsSection() {
  const showToast = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const removeChannel = () => {
    setIsConnected(false);
    showToast({
      body: 'Instagram removed from this workspace.',
      uniqueID: 'channel-removed',
      endContent: (
        <Button
          label="Undo"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsConnected(true);
            showToast({ body: 'Instagram is back.', uniqueID: 'channel-removed' });
          }}
        />
      ),
    });
  };

  return (
    <DemoSection
      eyebrow="Buttons"
      title="One ink pill per view"
      description="The filled ink button is the main action. Everything else is an outline or ghost pill."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            label="Add a channel"
            variant="primary"
            icon={<LineIcon icon={Plus} />}
            onClick={() => setIsDialogOpen(true)}
          />
          <Button label="Invite teammate" icon={<LineIcon icon={UserPlus} />} />
          <Button label="Read the guide" variant="ghost" icon={<LineIcon icon={BookOpen} />} />
          <Button
            label={isConnected ? 'Remove Instagram' : 'Instagram removed'}
            variant="destructive"
            icon={<LineIcon icon={Trash2} />}
            isDisabled={!isConnected}
            onClick={removeChannel}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] tracking-wider text-secondary uppercase">
            States
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Button label="Saving" isLoading />
            <Button label="Export report" isDisabled />
            <Button
              label="More actions"
              variant="ghost"
              isIconOnly
              icon={<LineIcon icon={MoreHorizontal} />}
              tooltip="More actions"
            />
          </div>
          <Text type="supporting" color="secondary">
            Hover and press come from the theme. Press Tab to see the cobalt focus ring.
          </Text>
        </div>
      </div>
      <AddChannelDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </DemoSection>
  );
}
