import { sql } from 'drizzle-orm';
import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

/** Primary key: UUIDv7 generated in the app (time-ordered, requirements §11.1). */
export const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** created_at / updated_at, timestamptz in UTC. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Case-insensitive text (emails). */
export const citext = customType<{ data: string }>({ dataType: () => 'citext' });

/** SQL list for a CHECK constraint from a shared enum, e.g. `status IN ('a','b')`. */
export const oneOf = (column: string, values: readonly string[]) =>
  sql.raw(`${column} IN (${values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')})`);
