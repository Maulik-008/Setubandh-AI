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
  boolean,
  char,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
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
  avatarUrl: text('avatar_url'),
  locale: text('locale').notNull().default('en'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
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
    check('memberships_role_check', oneOf('role', MEMBERSHIP_ROLES)),
    check('memberships_status_check', oneOf('status', MEMBERSHIP_STATUSES)),
    check('memberships_availability_check', oneOf('availability', AVAILABILITY_STATUSES)),
  ],
);
