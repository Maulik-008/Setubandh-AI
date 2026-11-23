import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { useState, type FormEvent } from 'react';
import { CHANNELS, type Channel } from './sample-data';

const CHANNEL_OPTIONS = CHANNELS.map(({ id, label }) => ({ value: id, label }));

/**
 * Specimen for Dialog, a form inside it and the toast that follows. Validates on
 * submit: the submit button is never disabled.
 */
export function AddChannelDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [nameError, setNameError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    onOpenChange(false);
    setName('');
    setNameError(undefined);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError('Enter the name customers see, for example Kesari Threads.');
      return;
    }
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSaving(false);
    const label = CHANNELS.find(({ id }) => id === channel)?.label ?? 'Channel';
    close();
    showToast({ body: `${label} connected as ${name.trim()}.` });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => (open ? onOpenChange(true) : close())}
      purpose="form"
      width={440}
    >
      <DialogHeader
        title="Add a channel"
        subtitle="Customers message you here once it is connected."
        onOpenChange={(open) => (open ? undefined : close())}
      />
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="mt-5 flex flex-col gap-4"
      >
        <TextInput
          label="Display name"
          value={name}
          onChange={(value) => {
            setName(value);
            if (nameError) setNameError(undefined);
          }}
          isRequired
          hasAutoFocus
          status={nameError ? { type: 'error', message: nameError } : undefined}
        />
        <Selector
          label="Channel"
          options={CHANNEL_OPTIONS}
          value={channel}
          onChange={(value) => {
            const next = CHANNELS.find(({ id }) => id === value);
            if (next) setChannel(next.id);
          }}
        />
        <footer className="mt-2 flex justify-end gap-2">
          <Button label="Cancel" variant="ghost" onClick={close} />
          <Button label="Connect channel" variant="primary" type="submit" isLoading={isSaving} />
        </footer>
      </form>
    </Dialog>
  );
}
