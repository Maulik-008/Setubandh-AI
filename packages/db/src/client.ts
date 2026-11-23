import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema';

export type PlatformDb = NodePgDatabase<typeof schema>;
/** The transaction handed to `withTenant` callbacks; every query in it is tenant-scoped by RLS. */
export type TenantTx = Parameters<Parameters<PlatformDb['transaction']>[0]>[0];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Database {
  /**
   * Platform-scope access (tenants, users, memberships; requirements §11.2). Tenant tables
   * queried here return no rows: always use `withTenant` for tenant data.
   */
  platform: PlatformDb;
  /**
   * Run `fn` in a transaction scoped to one tenant and user (rule 1). Sets `app.tenant_id` and
   * `app.user_id` for this transaction only; RLS then limits every tenant table to that tenant.
   */
  withTenant: <T>(
    tenantId: string,
    userId: string | null,
    fn: (tx: TenantTx) => Promise<T>,
  ) => Promise<T>;
  close: () => Promise<void>;
}

/** Connect as the app role (orbit_app, NOBYPASSRLS). The only place a pool is created (rule 1). */
export function createDatabase(connectionString: string, options: { max?: number } = {}): Database {
  const pool = new pg.Pool({
    connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'setubandh',
  });
  const platform = drizzle(pool, { schema, casing: 'snake_case' });

  return {
    platform,
    withTenant: (tenantId, userId, fn) => {
      if (!UUID.test(tenantId)) return Promise.reject(new Error('tenantId must be a UUID'));
      if (userId !== null && !UUID.test(userId)) {
        return Promise.reject(new Error('userId must be a UUID or null'));
      }
      return platform.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('app.tenant_id', ${tenantId}, true), set_config('app.user_id', ${userId ?? ''}, true)`,
        );
        return fn(tx);
      });
    },
    close: () => pool.end(),
  };
}
