import { inet, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

// Audit logs (M1-12; requirements §11.2, FR-AUD-01..03). The tables are created by the
// hand-written migration 0005 (monthly partitions, append-only grants), so this file is left out
// of drizzle-kit's diff (drizzle.config.ts) and only describes them for queries.

export const AUDIT_ACTOR_TYPES = ['user', 'ai', 'system', 'platform_admin'] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

/** Tenant audit log: RLS, read and insert only for orbit_app. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .notNull()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id').notNull(),
    actorType: text('actor_type').$type<AuditActorType>().notNull(),
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ip: inet('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.id, t.createdAt] })],
);

/** Platform audit log: every platform admin action (FR-AUD-02). Read and insert only. */
export const platformAuditLogs = pgTable(
  'platform_audit_logs',
  {
    id: uuid('id')
      .notNull()
      .$defaultFn(() => uuidv7()),
    adminId: uuid('admin_id').notNull(),
    tenantId: uuid('tenant_id'),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    reason: text('reason'),
    ip: inet('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.id, t.createdAt] })],
);
