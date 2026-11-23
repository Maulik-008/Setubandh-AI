import {
  AVAILABILITY_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  TENANT_STATUSES,
  type AvailabilityStatus,
  type MembershipRole,
  type MembershipStatus,
  type TenantStatus,
} from '@setubandh/shared';
import {
  bigint,
  boolean,
  char,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { citext, id, oneOf, timestamps } from './columns';

// Platform scope (requirements §11.2): no RLS. Read by auth, tenancy, platform-admin and billing.

export const tenants = pgTable(
  'tenants',
  {
    id: id(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    status: text('status').$type<TenantStatus>().notNull().default('trialing'),
    country: char('country', { length: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    timezone: text('timezone').notNull(),
    industry: text('industry'),
    planId: uuid('plan_id'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    deletionScheduledAt: timestamp('deletion_scheduled_at', { withTimezone: true }),
    /** "Agents can see all conversations" (M1-11; default off). */
    agentsSeeAllConversations: boolean('agents_see_all_conversations').notNull().default(false),
    branding: jsonb('branding').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  () => [check('tenants_status_check', oneOf('status', TENANT_STATUSES))],
);

export const users = pgTable('users', {
  id: id(),
  email: citext('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  totpSecretEnc: text('totp_secret_enc'),
  totpEnabled: boolean('totp_enabled').notNull().default(false),
  /** Last accepted TOTP time step: a code can never be used twice. */
  totpLastStep: bigint('totp_last_step', { mode: 'number' }),
  avatarUrl: text('avatar_url'),
  locale: text('locale').notNull().default('en'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  /** The workspace the switcher opens next time (FR-AUTH-07). */
  lastTenantId: uuid('last_tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: text('role').$type<MembershipRole>().notNull(),
    customRoleId: uuid('custom_role_id'),
    status: text('status').$type<MembershipStatus>().notNull().default('active'),
    availability: text('availability').$type<AvailabilityStatus>().notNull().default('offline'),
    ...timestamps,
  },
  (t) => [
    unique('memberships_user_tenant_unique').on(t.userId, t.tenantId),
    index('memberships_tenant_id_idx').on(t.tenantId),
    /** Exactly one Owner per workspace; ownership moves only by transfer. */
    uniqueIndex('memberships_one_owner_per_tenant')
      .on(t.tenantId)
      .where(sql`${t.role} = 'owner'`),
    check('memberships_role_check', oneOf('role', MEMBERSHIP_ROLES)),
    check('memberships_status_check', oneOf('status', MEMBERSHIP_STATUSES)),
    check('memberships_availability_check', oneOf('availability', AVAILABILITY_STATUSES)),
  ],
);

export const INVITATION_ROLES = ['admin', 'agent'] as const;
export type InvitationRole = (typeof INVITATION_ROLES)[number];

/**
 * Pending invitations to a workspace (FR-AUTH-06). Platform scope like memberships: accepting one
 * looks it up by token before any workspace is known. Only the SHA-256 of the token is stored.
 */
export const invitations = pgTable(
  'invitations',
  {
    id: id(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: citext('email').notNull(),
    role: text('role').$type<InvitationRole>().notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    /** One open invitation per email and workspace; a new invite replaces the old one. */
    uniqueIndex('invitations_open_tenant_email_unique')
      .on(t.tenantId, t.email)
      .where(sql`${t.acceptedAt} IS NULL AND ${t.revokedAt} IS NULL`),
    index('invitations_invited_by_idx').on(t.invitedBy),
    check('invitations_role_check', oneOf('role', INVITATION_ROLES)),
  ],
);
