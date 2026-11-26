import { Avatar } from '@astryxdesign/core/Avatar';
import { DropdownMenu, type DropdownMenuOption } from '@astryxdesign/core/DropdownMenu';
import { StatusDot, type StatusDotVariant } from '@astryxdesign/core/StatusDot';
import {
  AVAILABILITY_STATUSES,
  type AvailabilityStatus,
  type WorkspaceResponse,
} from '@setubandh/shared';
import { LineIcon } from '@setubandh/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, LogOut, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { api } from '../api/client';
import { useSession } from '../auth/SessionProvider';
import { useWorkspace } from '../workspace/WorkspaceProvider';

const DOT: Record<AvailabilityStatus, StatusDotVariant> = {
  online: 'success',
  away: 'warning',
  offline: 'neutral',
};

/** Name, email, availability in this workspace (Online / Away / Offline), Profile, Sign out. */
export function ProfileMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { state, signOut } = useSession();
  const { active, current } = useWorkspace();
  const user = state.status === 'signedIn' ? state.user : null;
  const availability = current?.availability ?? 'offline';

  const setAvailability = useMutation({
    mutationFn: (next: AvailabilityStatus) =>
      api<{ availability: AvailabilityStatus }>('/v1/members/me', {
        method: 'PATCH',
        body: { availability: next },
      }),
    onSuccess: ({ availability: next }) =>
      queryClient.setQueryData<WorkspaceResponse>([active?.id, 'workspace'], (w) =>
        w ? { ...w, availability: next } : w,
      ),
  });

  if (!user) return null;
  const items: DropdownMenuOption[] = [
    {
      type: 'section',
      title: t('shell.availability'),
      items: AVAILABILITY_STATUSES.map((status) => ({
        id: `availability-${status}`,
        label: t(`availability.${status}`),
        icon: <StatusDot variant={DOT[status]} label={t(`availability.${status}`)} />,
        endContent: status === availability ? <LineIcon icon={Check} /> : undefined,
        onClick: () => setAvailability.mutate(status),
      })),
    },
    { type: 'divider' },
    {
      id: 'profile',
      label: t('shell.profile'),
      icon: <LineIcon icon={UserRound} />,
      onClick: () => void navigate('/settings/profile'),
    },
    {
      id: 'sign-out',
      label: t('shell.signOut'),
      icon: <LineIcon icon={LogOut} />,
      onClick: () => void signOut().then(() => navigate('/login', { replace: true })),
    },
  ];
  return (
    <DropdownMenu
      items={items}
      alignment="end"
      hasChevron={false}
      header={
        <span className="flex flex-col px-3 py-2">
          <span className="text-sm font-semibold">{user.name}</span>
          <span className="text-xs text-secondary">{user.email}</span>
        </span>
      }
      button={{
        label: t('shell.profileMenu', {
          name: user.name,
          status: t(`availability.${availability}`),
        }),
        isIconOnly: true,
        variant: 'ghost',
        icon: (
          <Avatar
            name={user.name}
            size="sm"
            tooltip={false}
            status={
              <StatusDot variant={DOT[availability]} label={t(`availability.${availability}`)} />
            }
          />
        ),
      }}
    />
  );
}
