import type { MembershipRole } from './enums';

/**
 * Workspace permissions (requirements §6, plan §3). The API checks them with
 * `@RequirePermission(...)`; the UI hides what a role cannot do with `<Can>`. The server decides.
 */
export const PERMISSIONS = [
  'inbox.view_all',
  'inbox.view_unassigned',
  'inbox.reply',
  'inbox.resolve',
  'inbox.assign_self',
  'inbox.assign_any',
  'contacts.edit',
  'saved_replies.manage_own',
  'saved_replies.manage_shared',
  'channels.manage',
  'members.manage',
  'workspace.settings',
  'workspace.transfer_ownership',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const AGENT: readonly Permission[] = [
  'inbox.view_unassigned',
  'inbox.reply',
  'inbox.resolve',
  'inbox.assign_self',
  'contacts.edit',
  'saved_replies.manage_own',
];
const ADMIN: readonly Permission[] = [
  ...AGENT,
  'inbox.view_all',
  'inbox.assign_any',
  'saved_replies.manage_shared',
  'channels.manage',
  'members.manage',
  'workspace.settings',
];
const OWNER: readonly Permission[] = [...ADMIN, 'workspace.transfer_ownership'];

/** Role → permissions. Manager and Viewer arrive in M3 (no schema change); until then they get nothing. */
export const ROLE_PERMISSIONS: Readonly<Record<MembershipRole, readonly Permission[]>> = {
  owner: OWNER,
  admin: ADMIN,
  agent: AGENT,
  manager: [],
  viewer: [],
};

export interface WorkspaceSettingsForPermissions {
  /** "Agents can see all conversations" (default off). */
  agentsSeeAllConversations: boolean;
}

/** What a member may do in a workspace: role permissions plus what workspace settings grant. */
export function permissionsFor(
  role: MembershipRole,
  settings: WorkspaceSettingsForPermissions,
): Permission[] {
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role]);
  if (role === 'agent' && settings.agentsSeeAllConversations) granted.add('inbox.view_all');
  return PERMISSIONS.filter((p) => granted.has(p));
}
