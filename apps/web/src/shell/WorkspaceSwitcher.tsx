import { ListItem } from '@astryxdesign/core/List';
import { SideNavHeading } from '@astryxdesign/core/SideNav';
import { MAX_OWNED_WORKSPACES } from '@setubandh/shared';
import { CATEGORY_CLASSES, LineIcon } from '@setubandh/ui';
import { Building2, Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspace } from '../workspace/WorkspaceProvider';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

const WORKSPACE_CHIP = [
  'flex size-9 items-center justify-center rounded-full',
  CATEGORY_CLASSES.violet.chip,
  CATEGORY_CLASSES.violet.glyph,
].join(' ');

/** The workspace switcher at the top of the sidebar (FR-AUTH-07). */
export function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const { workspaces, active, switchTo } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const owned = workspaces.filter((w) => w.role === 'owner').length;
  return (
    <>
      <SideNavHeading
        icon={
          // Pastel icon chip (the accent is never a fill): Paper & Pastel identity rule 5.
          <span className={WORKSPACE_CHIP}>
            <LineIcon icon={Building2} />
          </span>
        }
        superheading={t('shell.workspace')}
        heading={active?.name ?? t('shell.noWorkspace')}
        subheading={active ? t(`roles.${active.role}`) : undefined}
        menu={
          <>
            {workspaces.map((w) => (
              <ListItem
                key={w.id}
                label={w.name}
                description={t(`roles.${w.role}`)}
                isSelected={w.id === active?.id}
                endContent={w.id === active?.id ? <LineIcon icon={Check} /> : undefined}
                onClick={() => switchTo(w.id)}
              />
            ))}
            <ListItem
              label={t('shell.createWorkspace')}
              description={
                owned >= MAX_OWNED_WORKSPACES
                  ? t('shell.workspaceLimit', { max: MAX_OWNED_WORKSPACES })
                  : undefined
              }
              isDisabled={owned >= MAX_OWNED_WORKSPACES}
              startContent={<LineIcon icon={Plus} />}
              onClick={() => setIsCreating(true)}
            />
          </>
        }
      />
      <CreateWorkspaceDialog isOpen={isCreating} onOpenChange={setIsCreating} />
    </>
  );
}
