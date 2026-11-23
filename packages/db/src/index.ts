/** @setubandh/db: Drizzle schema, migrations, RLS policies and the tenant-scoped db helper. */
export const PACKAGE_NAME = '@setubandh/db';
export { createDatabaseHealth, type DatabaseHealth } from './health';
export { createDatabase, type Database, type PlatformDb, type TenantTx } from './client';
export { migrate, MIGRATIONS_FOLDER } from './migrate';
export { tenantIsolationSql } from './rls';
export * from './schema';
export { seed, DEMO_TENANT_SLUG } from './seed';
/** Query operators re-exported so apps never depend on drizzle-orm directly (rule 1). */
export { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
