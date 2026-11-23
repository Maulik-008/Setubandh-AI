// Enum values stored as text + CHECK constraint in Postgres (requirements §11.1).
// The database schema, Zod schemas and UI all read them from here.

/** Tenant lifecycle (requirements §5.3). */
export const TENANT_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'expired',
  'suspended',
  'cancelled',
  'pending_deletion',
  'deleted',
] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

/** Workspace roles (requirements §6.1; MVP 1 uses owner, admin, agent). */
export const MEMBERSHIP_ROLES = ['owner', 'admin', 'manager', 'agent', 'viewer'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'disabled'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const AVAILABILITY_STATUSES = ['online', 'away', 'offline'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];
