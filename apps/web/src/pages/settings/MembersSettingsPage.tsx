import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import {
  ASSIGNABLE_ROLES,
  type AssignableRole,
  type Invitation,
  type Member,
} from '@setubandh/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useChangeRole,
  useInvitations,
  useMembers,
  useRemoveMember,
  useResendInvitation,
  useRevokeInvitation,
  useTransferOwnership,
} from '../../api/settings';
import { ApiError } from '../../api/client';
import { useSession } from '../../auth/SessionProvider';
import { ScrollableTable } from '../../components/ScrollableTable';
import { usePageTitle } from '../../components/usePageTitle';
import { Can, useCan, useWorkspace } from '../../workspace/WorkspaceProvider';
import { InviteDialog } from './InviteDialog';
import { SettingsSection } from './SettingsSection';

const message = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Members, invitations and ownership (FR-AUTH-06, requirements §6). The API enforces every rule. */
export function MembersSettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('settings.tabs.members'));
  const [isInviting, setIsInviting] = useState(false);
  return (
    <Stack gap={6}>
      <SettingsSection
        title={t('settings.members.title')}
        description={t('settings.members.lead')}
        actions={
          <Can permission="members.manage">
            <Button
              variant="primary"
              label={t('settings.members.invite')}
              onClick={() => setIsInviting(true)}
            />
          </Can>
        }
      >
        <MembersTable />
      </SettingsSection>
      <Can permission="members.manage">
        <InvitationsSection />
      </Can>
      <Can permission="workspace.transfer_ownership">
        <TransferOwnershipSection />
      </Can>
      <InviteDialog isOpen={isInviting} onOpenChange={setIsInviting} />
    </Stack>
  );
}

function useDateFormat() {
  const { current } = useWorkspace();
  return (iso: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: current?.timezone }).format(
      new Date(iso),
    );
}

function MembersTable() {
  const { t } = useTranslation();
  const members = useMembers();
  const canManage = useCan('members.manage');
  const changeRole = useChangeRole();
  const showToast = useToast();
  const formatDate = useDateFormat();
  const [removing, setRemoving] = useState<Member | null>(null);

  if (members.isPending) return <Skeleton height={120} />;
  if (members.isError) {
    return (
      <Banner
        status="error"
        title={message(members.error, t('settings.loadFailed'))}
        endContent={<Button label={t('routeError.retry')} onClick={() => void members.refetch()} />}
      />
    );
  }

  return (
    <>
      <ScrollableTable label={t('settings.members.title')}>
        <Table<Member>
          data={members.data.members}
          idKey="id"
          columns={[
            {
              key: 'name',
              header: t('settings.members.member'),
              renderCell: (m) => (
                <span className="flex min-w-0 flex-col">
                  <Text weight="medium">{m.name}</Text>
                  <Text color="secondary" size="sm">
                    {m.email}
                  </Text>
                </span>
              ),
            },
            {
              key: 'role',
              header: t('settings.members.role'),
              renderCell: (m) =>
                canManage && m.role !== 'owner' ? (
                  <Selector
                    label={t('settings.members.roleFor', { name: m.name })}
                    isLabelHidden
                    size="sm"
                    options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
                    value={m.role}
                    changeAction={async (value) => {
                      if (!value || value === m.role) return;
                      try {
                        await changeRole.mutateAsync({ id: m.id, role: value as AssignableRole });
                        showToast({
                          body: t('settings.members.roleChanged', {
                            name: m.name,
                            role: t(`roles.${value}`),
                          }),
                        });
                      } catch (e) {
                        showToast({ body: message(e, t('common.unexpectedError')), type: 'error' });
                      }
                    }}
                  />
                ) : (
                  <Text>{t(`roles.${m.role}`)}</Text>
                ),
            },
            {
              key: 'joinedAt',
              header: t('settings.members.joined'),
              renderCell: (m) => <Text hasTabularNumbers>{formatDate(m.joinedAt)}</Text>,
            },
            {
              key: 'actions',
              header: t('settings.members.actions'),
              align: 'end',
              renderCell: (m) =>
                canManage && m.role !== 'owner' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    label={t('settings.members.remove')}
                    tooltip={t('settings.members.removeTooltip', { name: m.name })}
                    onClick={() => setRemoving(m)}
                  />
                ) : null,
            },
          ]}
        />
      </ScrollableTable>
      <RemoveMemberDialog member={removing} onClose={() => setRemoving(null)} />
    </>
  );
}

function RemoveMemberDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { t } = useTranslation();
  const remove = useRemoveMember();
  const showToast = useToast();
  return (
    <AlertDialog
      isOpen={member !== null}
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={t('settings.members.removeTitle', { name: member?.name ?? '' })}
      description={t('settings.members.removeLead')}
      actionLabel={t('settings.members.removeConfirm')}
      cancelLabel={t('common.cancel')}
      isActionLoading={remove.isPending}
      onAction={async () => {
        if (!member) return;
        try {
          await remove.mutateAsync(member.id);
          showToast({ body: t('settings.members.removed', { name: member.name }) });
        } catch (e) {
          showToast({ body: message(e, t('common.unexpectedError')), type: 'error' });
        }
        onClose();
      }}
    />
  );
}

function InvitationsSection() {
  const { t } = useTranslation();
  const invitations = useInvitations(true);
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const showToast = useToast();
  const formatDate = useDateFormat();
  const run = async (action: Promise<unknown>, ok: string) => {
    try {
      await action;
      showToast({ body: ok });
    } catch (e) {
      showToast({ body: message(e, t('common.unexpectedError')), type: 'error' });
    }
  };
  return (
    <SettingsSection
      title={t('settings.invitations.title')}
      description={t('settings.invitations.lead')}
    >
      {invitations.isPending ? (
        <Skeleton height={80} />
      ) : invitations.isError ? (
        <Banner status="error" title={message(invitations.error, t('settings.loadFailed'))} />
      ) : invitations.data.invitations.length === 0 ? (
        <Text color="secondary">{t('settings.invitations.none')}</Text>
      ) : (
        <ScrollableTable label={t('settings.invitations.title')}>
          <Table<Invitation>
            data={invitations.data.invitations}
            idKey="id"
            columns={[
              {
                key: 'email',
                header: t('fields.email'),
                renderCell: (i) => <Text>{i.email}</Text>,
              },
              {
                key: 'role',
                header: t('settings.members.role'),
                renderCell: (i) => <Text>{t(`roles.${i.role}`)}</Text>,
              },
              {
                key: 'expiresAt',
                header: t('settings.invitations.expires'),
                renderCell: (i) => <Text hasTabularNumbers>{formatDate(i.expiresAt)}</Text>,
              },
              {
                key: 'actions',
                header: t('settings.members.actions'),
                align: 'end',
                renderCell: (i) => (
                  <span className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      label={t('settings.invitations.resend')}
                      tooltip={t('settings.invitations.resendTooltip', { email: i.email })}
                      clickAction={() =>
                        run(
                          resend.mutateAsync(i.id),
                          t('settings.invitations.resent', { email: i.email }),
                        )
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      label={t('settings.invitations.revoke')}
                      tooltip={t('settings.invitations.revokeTooltip', { email: i.email })}
                      clickAction={() =>
                        run(
                          revoke.mutateAsync(i.id),
                          t('settings.invitations.revoked', { email: i.email }),
                        )
                      }
                    />
                  </span>
                ),
              },
            ]}
          />
        </ScrollableTable>
      )}
    </SettingsSection>
  );
}

function TransferOwnershipSection() {
  const { t } = useTranslation();
  const { state } = useSession();
  const members = useMembers();
  const transfer = useTransferOwnership();
  const showToast = useToast();
  const [target, setTarget] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const myId = state.status === 'signedIn' ? state.user.id : null;
  const candidates = (members.data?.members ?? []).filter((m) => m.userId !== myId);
  const chosen = candidates.find((m) => m.id === target);
  return (
    <SettingsSection title={t('settings.transfer.title')} description={t('settings.transfer.lead')}>
      <Stack direction="horizontal" gap={3} align="end" wrap="wrap">
        <Selector
          label={t('settings.transfer.newOwner')}
          placeholder={t('settings.transfer.choose')}
          options={candidates.map((m) => ({ value: m.id, label: m.name, description: m.email }))}
          value={target ?? undefined}
          onChange={setTarget}
          emptyText={t('settings.transfer.noCandidates')}
        />
        <Button
          variant="destructive"
          label={t('settings.transfer.action')}
          isDisabled={!chosen}
          onClick={() => setIsConfirming(true)}
        />
      </Stack>
      <AlertDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title={t('settings.transfer.confirmTitle', { name: chosen?.name ?? '' })}
        description={t('settings.transfer.confirmLead')}
        actionLabel={t('settings.transfer.confirm')}
        cancelLabel={t('common.cancel')}
        isActionLoading={transfer.isPending}
        onAction={async () => {
          if (!chosen) return;
          try {
            await transfer.mutateAsync(chosen.id);
            showToast({ body: t('settings.transfer.done', { name: chosen.name }) });
          } catch (e) {
            showToast({ body: message(e, t('common.unexpectedError')), type: 'error' });
          }
          setIsConfirming(false);
        }}
      />
    </SettingsSection>
  );
}
