import { sql } from 'drizzle-orm';
import { check, index, inet, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, oneOf } from './columns';
import { users } from './platform';

// Platform scope (requirements §11.2): sessions, one-time email links and security events.

export const EMAIL_TOKEN_PURPOSES = ['verify_email', 'reset_password'] as const;
export type EmailTokenPurpose = (typeof EMAIL_TOKEN_PURPOSES)[number];

export const SECURITY_EVENT_TYPES = [
  'signup',
  'login_succeeded',
  'login_failed',
  'login_locked',
  'refresh_token_reuse',
  'logout',
  'email_verified',
  'password_reset_requested',
  'password_reset',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

/** One row per refresh token. Rotation links tokens of one sign-in through `family_id`. */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    /** HMAC-SHA256 of the token; the token itself is never stored. */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedAt: timestamp('replaced_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ip: inet('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_user_family_idx').on(t.userId, t.familyId)],
);

/** Single-use links: email verification (24 h) and password reset (1 h). */
export const emailTokens = pgTable(
  'email_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').$type<EmailTokenPurpose>().notNull(),
    /** SHA-256 of the token sent by email. */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('email_tokens_user_purpose_idx').on(t.userId, t.purpose),
    check('email_tokens_purpose_check', oneOf('purpose', EMAIL_TOKEN_PURPOSES)),
  ],
);

/** Security audit trail for accounts (M1-12 makes audit tables append-only and partitioned). */
export const securityEvents = pgTable(
  'security_events',
  {
    id: id(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    type: text('type').$type<SecurityEventType>().notNull(),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('security_events_user_created_idx').on(t.userId, t.createdAt),
    check('security_events_type_check', oneOf('type', SECURITY_EVENT_TYPES)),
  ],
);
