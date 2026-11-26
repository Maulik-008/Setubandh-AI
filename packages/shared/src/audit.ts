// Audit actions (FR-AUD-01, M1-12). Named `area.verb`; add new actions here, never inline.
// Tenant audit log: what happened inside a workspace. Platform audit log: platform admin actions.

export const AUDIT_ACTIONS = [
  'member.invited',
  'member.role_changed',
  'member.removed',
  'invitation.accepted',
  'invitation.revoked',
  'workspace.settings_changed',
  'workspace.ownership_transferred',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Platform admin actions; the first callers arrive with admin lite (M1-30). */
export const PLATFORM_AUDIT_ACTIONS = [
  'tenant.suspend',
  'tenant.unsuspend',
  'tenant.change_limits',
  'tenant.impersonate',
  'settings.change',
] as const;
export type PlatformAuditAction = (typeof PLATFORM_AUDIT_ACTIONS)[number];
