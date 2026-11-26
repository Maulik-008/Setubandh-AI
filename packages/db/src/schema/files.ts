import { bigint, check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { FILE_PURPOSES, FILE_STATUSES, type FilePurpose, type FileStatus } from '@setubandh/shared';
import { sql } from 'drizzle-orm';
import { id, oneOf } from './columns';
import { tenants, users } from './platform';

// Tenant scope (M1-14): uploaded files. RLS through tenantIsolationSql (migration 0008).

// Purposes (MVP 1: attachments only) and statuses come from @setubandh/shared, like every enum.

export const files = pgTable(
  'files',
  {
    id: id(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    purpose: text('purpose').$type<FilePurpose>().notNull(),
    /** Object key: tenants/{tenantId}/{purpose}/{yyyy}/{mm}/{fileId}. Never contains the filename. */
    storageKey: text('storage_key').notNull().unique(),
    /** The original name, shown to people and sent as Content-Disposition. */
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    status: text('status').$type<FileStatus>().notNull().default('pending'),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('files_tenant_created_idx').on(t.tenantId, t.createdAt),
    index('files_uploaded_by_idx').on(t.uploadedBy),
    check('files_purpose_check', oneOf('purpose', FILE_PURPOSES)),
    check('files_status_check', oneOf('status', FILE_STATUSES)),
    check('files_size_check', sql`${t.sizeBytes} > 0`),
  ],
);
