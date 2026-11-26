import type {
  AssignableRole,
  CreateInvitationRequest,
  Invitation,
  InvitationListResponse,
  MeResponse,
  MemberListResponse,
  RecoveryCodesResponse,
  TwoFactorSetupResponse,
  UpdateMeRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
} from '@setubandh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspace, WORKSPACES_KEY } from '../workspace/WorkspaceProvider';
import { api } from './client';

// Settings data (M1-13 over the M1-10 / M1-11 APIs). Query keys are [workspaceId, resource]
// (requirements §13.2), so a workspace switch can never show another workspace's rows.

function useWorkspaceKey(resource: string) {
  const { active } = useWorkspace();
  return [active?.id ?? null, resource] as const;
}

export function useMembers() {
  const key = useWorkspaceKey('members');
  return useQuery({
    queryKey: key,
    queryFn: () => api<MemberListResponse>('/v1/members'),
    enabled: key[0] !== null,
  });
}

export function useInvitations(enabled: boolean) {
  const key = useWorkspaceKey('invitations');
  return useQuery({
    queryKey: key,
    queryFn: () => api<InvitationListResponse>('/v1/invitations'),
    enabled: enabled && key[0] !== null,
  });
}

/** Mutations that change members or invitations refresh both lists. */
function useMembersMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const { active } = useWorkspace();
  return useMutation({
    mutationFn: fn,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: [active?.id, 'members'] });
      await queryClient.invalidateQueries({ queryKey: [active?.id, 'invitations'] });
    },
  });
}

export const useInvite = () =>
  useMembersMutation((body: CreateInvitationRequest) =>
    api<Invitation>('/v1/invitations', { method: 'POST', body }),
  );
export const useResendInvitation = () =>
  useMembersMutation((id: string) => api<void>(`/v1/invitations/${id}/resend`, { method: 'POST' }));
export const useRevokeInvitation = () =>
  useMembersMutation((id: string) => api<void>(`/v1/invitations/${id}`, { method: 'DELETE' }));
export const useChangeRole = () =>
  useMembersMutation(({ id, role }: { id: string; role: AssignableRole }) =>
    api<void>(`/v1/members/${id}`, { method: 'PATCH', body: { role } }),
  );
export const useRemoveMember = () =>
  useMembersMutation((id: string) => api<void>(`/v1/members/${id}`, { method: 'DELETE' }));

/** Transfer changes my own role too, so the workspace and the switcher list reload. */
export function useTransferOwnership() {
  const queryClient = useQueryClient();
  const { active } = useWorkspace();
  return useMutation({
    mutationFn: (memberId: string) =>
      api<void>('/v1/workspace/transfer-ownership', { method: 'POST', body: { memberId } }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: [active?.id] });
      await queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  const { active } = useWorkspace();
  return useMutation({
    mutationFn: (body: UpdateWorkspaceRequest) =>
      api<WorkspaceResponse>('/v1/workspace', { method: 'PATCH', body }),
    onSuccess: async (workspace) => {
      queryClient.setQueryData([active?.id, 'workspace'], workspace);
      await queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY }); // the name shows in the switcher
    },
  });
}

// --- the signed-in user (not workspace scoped) -------------------------------------------------

export const ME_KEY = ['me'] as const;

export const useMe = () =>
  useQuery({ queryKey: ME_KEY, queryFn: () => api<MeResponse>('/v1/me', { workspace: false }) });

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) =>
      api<MeResponse>('/v1/me', { method: 'PATCH', body, workspace: false }),
    onSuccess: (me) => queryClient.setQueryData(ME_KEY, me),
  });
}

export const twoFactorApi = {
  setup: () =>
    api<TwoFactorSetupResponse>('/v1/me/2fa/setup', { method: 'POST', workspace: false }),
  enable: (code: string) =>
    api<RecoveryCodesResponse>('/v1/me/2fa/enable', {
      method: 'POST',
      body: { code },
      workspace: false,
    }),
  disable: (password: string) =>
    api<void>('/v1/me/2fa/disable', { method: 'POST', body: { password }, workspace: false }),
};
