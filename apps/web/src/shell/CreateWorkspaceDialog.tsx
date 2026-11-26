import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useTranslation } from 'react-i18next';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';

export function CreateWorkspaceDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <DialogHeader
        title={t('shell.createWorkspace')}
        subtitle={t('shell.createWorkspaceLead')}
        onOpenChange={onOpenChange}
      />
      <span className="mt-5 block">
        {isOpen ? <CreateWorkspaceForm onCreated={() => onOpenChange(false)} /> : null}
      </span>
    </Dialog>
  );
}
