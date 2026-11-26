import { adminQuery, createTestDatabase, type TestDatabase } from '@setubandh/testing';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createDatabase, migrate, tenantIsolationSql, type Database } from '../src/index';

// M1-04 acceptance, proved on a test-only tenant table built with the RLS helper
// (week 1 decision: tenants/users/memberships stay platform scope as in requirements §11.2).

describe('tenant isolation with row-level security (requirements §5.2)', () => {
  let testDb: TestDatabase;
  let db: Database;
  const tenantA = uuidv7();
  const tenantB = uuidv7();
  const user = uuidv7();

  beforeAll(async () => {
    testDb = await createTestDatabase(inject('postgresUrl'));
    const appUrl = testDb.appUrl;
    await migrate({ adminUrl: testDb.adminUrl, appUrl });

    // Test-only tenant table, protected exactly like real tenant tables will be.
    const admin = new pg.Client({ connectionString: testDb.adminUrl });
    await admin.connect();
    await admin.query(`
      CREATE TABLE rls_probe (
        id uuid PRIMARY KEY,
        tenant_id uuid NOT NULL REFERENCES tenants(id),
        body text NOT NULL
      );
      CREATE INDEX rls_probe_tenant_id_idx ON rls_probe (tenant_id);
      ${tenantIsolationSql('rls_probe')}
      GRANT SELECT, INSERT, UPDATE, DELETE ON rls_probe TO orbit_app;
      INSERT INTO tenants (id, name, slug, status, country, currency, timezone)
        VALUES ('${tenantA}', 'A', 'a-${tenantA}', 'active', 'IN', 'INR', 'Asia/Kolkata'),
               ('${tenantB}', 'B', 'b-${tenantB}', 'active', 'IN', 'INR', 'Asia/Kolkata');
      INSERT INTO rls_probe (id, tenant_id, body)
        VALUES ('${uuidv7()}', '${tenantA}', 'a-row'), ('${uuidv7()}', '${tenantB}', 'b-row');
    `);
    await admin.end();

    db = createDatabase(appUrl);
  }, 120_000);

  afterAll(async () => {
    await db?.close();
    await testDb?.drop();
  });

  const probeRows = (q: { execute: Database['platform']['execute'] }) =>
    q.execute<{ body: string; tenant_id: string }>(
      sql`SELECT body, tenant_id FROM rls_probe ORDER BY body`,
    );

  it('returns zero rows from a tenant table when queried outside withTenant', async () => {
    const result = await probeRows(db.platform);
    expect(result.rows).toEqual([]);
  });

  it('returns only the current tenant rows inside withTenant', async () => {
    const rows = await db.withTenant(tenantA, user, async (tx) => (await probeRows(tx)).rows);
    expect(rows).toEqual([{ body: 'a-row', tenant_id: tenantA }]);
  });

  it("fails to insert a row with another tenant's id inside withTenant", async () => {
    await expectRlsViolation(
      db.withTenant(tenantA, user, (tx) =>
        tx.execute(
          sql`INSERT INTO rls_probe (id, tenant_id, body) VALUES (${uuidv7()}, ${tenantB}, 'sneaky')`,
        ),
      ),
    );
  });

  it("cannot move a row to another tenant or touch another tenant's rows", async () => {
    await expectRlsViolation(
      db.withTenant(tenantA, user, (tx) =>
        tx.execute(sql`UPDATE rls_probe SET tenant_id = ${tenantB}`),
      ),
    );
    const deleted = await db.withTenant(tenantA, user, (tx) =>
      tx.execute(sql`DELETE FROM rls_probe WHERE tenant_id = ${tenantB}`),
    );
    expect(deleted.rowCount).toBe(0);
  });

  it('does not leak the tenant setting after the transaction ends', async () => {
    await db.withTenant(tenantA, user, (tx) => probeRows(tx));
    expect((await probeRows(db.platform)).rows).toEqual([]);
  });

  it('exposes the current user id to the database inside withTenant', async () => {
    const rows = await db.withTenant(
      tenantA,
      user,
      async (tx) =>
        (await tx.execute<{ uid: string }>(sql`SELECT app_current_user_id() AS uid`)).rows,
    );
    expect(rows).toEqual([{ uid: user }]);
  });

  it('rejects a tenant id that is not a UUID before touching the database', async () => {
    await expect(db.withTenant("' OR 1=1 --", user, (tx) => probeRows(tx))).rejects.toThrow(
      /tenantId must be a UUID/,
    );
  });

  it('runs as orbit_app, which cannot bypass row-level security', async () => {
    const { rows } = await db.platform.execute<{
      rolname: string;
      rolbypassrls: boolean;
      rolsuper: boolean;
    }>(sql`SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`);
    expect(rows).toEqual([{ rolname: 'orbit_app', rolbypassrls: false, rolsuper: false }]);
  });

  it('protects every table that has a tenant_id column (guard for future tables)', async () => {
    const tables = await tenantTables(testDb.adminUrl);
    expect(tables).toEqual(expect.arrayContaining(['audit_logs', 'rls_probe']));
    expect(await tenantTableProblems(testDb.adminUrl)).toEqual([]);
  });

  it('AC: the guard fails when a new tenant table lacks RLS', async () => {
    await adminQuery(
      testDb.adminUrl,
      `CREATE TABLE unprotected_probe (id uuid PRIMARY KEY, tenant_id uuid NOT NULL)`,
    );
    try {
      expect(await tenantTableProblems(testDb.adminUrl)).toEqual([
        'unprotected_probe: row-level security is not enabled',
        'unprotected_probe: row-level security is not forced',
        'unprotected_probe: no policy compares tenant_id with app_current_tenant_id() in USING and WITH CHECK',
        'unprotected_probe: no index starts with tenant_id',
      ]);
    } finally {
      await adminQuery(testDb.adminUrl, `DROP TABLE unprotected_probe`);
    }
  });

  it("never shows one tenant's rows to another, in every tenant table", async () => {
    for (const table of await tenantTables(testDb.adminUrl)) {
      const seed = SEED_ROW[table];
      expect(seed, `add a seed row for "${table}" to SEED_ROW in this file`).toBeDefined();
      await adminQuery(testDb.adminUrl, seed!(tenantA));
      const count = (tenant: string) =>
        db.withTenant(tenant, user, async (tx) => {
          const { rows } = await tx.execute<{ n: number }>(
            sql`SELECT count(*)::int AS n FROM ${sql.identifier(table)} WHERE tenant_id = ${tenantA}`,
          );
          return rows[0]!.n;
        });
      expect(await count(tenantA), `${table} as tenant A`).toBeGreaterThan(0);
      expect(await count(tenantB), `${table} as tenant B`).toBe(0);
    }
  });

  it('keeps partitions of tenant tables closed to orbit_app (reachable only through the parent)', async () => {
    const rows = await adminQuery<{ partition: string; select: boolean; forced: boolean }>(
      testDb.adminUrl,
      `SELECT c.relname AS partition,
              has_table_privilege('orbit_app', c.oid, 'SELECT') AS select,
              c.relforcerowsecurity AS forced
       FROM pg_inherits i
       JOIN pg_class c ON c.oid = i.inhrelid
       JOIN pg_class p ON p.oid = i.inhparent
       WHERE p.relname IN ('audit_logs', 'platform_audit_logs')`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(10); // default + current month + 3 ahead, twice
    for (const row of rows)
      expect(row, row.partition).toMatchObject({ select: false, forced: true });
  });
});

/** Drizzle wraps driver errors; the cause must be Postgres' RLS violation (SQLSTATE 42501). */
async function expectRlsViolation(promise: Promise<unknown>): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error, 'expected the query to be rejected').toBeInstanceOf(Error);
  const cause = (error as Error).cause as { code?: string; message?: string } | undefined;
  expect(cause?.code).toBe('42501');
  expect(cause?.message).toMatch(/row-level security/);
}

/**
 * Platform-scope tables (requirements §11.2) that reference a tenant but are not RLS-protected.
 * They are read before a workspace is chosen (the switcher, the membership check, accepting an
 * invite by token), and every query on them names the tenant explicitly (M1-11 spec).
 */
const PLATFORM_TABLES_WITH_TENANT_ID = ['memberships', 'invitations', 'platform_audit_logs'];

/** One row for tenant `t` in each tenant table, inserted as admin. A new table needs an entry. */
const SEED_ROW: Record<string, (t: string) => string> = {
  rls_probe: (t) =>
    `INSERT INTO rls_probe (id, tenant_id, body) VALUES ('${uuidv7()}', '${t}', 'seed')`,
  audit_logs: (t) =>
    `INSERT INTO audit_logs (id, tenant_id, actor_type, action) VALUES ('${uuidv7()}', '${t}', 'system', 'test.seed')`,
};

/** Tenant tables: ordinary or partitioned parents with tenant_id, minus platform-scope ones. */
async function tenantTables(adminUrl: string): Promise<string[]> {
  const rows = await adminQuery<{ table: string }>(
    adminUrl,
    `SELECT c.relname AS table
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
     WHERE c.relkind IN ('r', 'p') AND NOT c.relispartition AND c.relname <> ALL($1)
     ORDER BY c.relname`,
    [PLATFORM_TABLES_WITH_TENANT_ID],
  );
  return rows.map((r) => r.table);
}

/** Every way a tenant table can fall short of requirements §5.2, as readable messages. */
async function tenantTableProblems(adminUrl: string): Promise<string[]> {
  const rows = await adminQuery<{
    table: string;
    rls: boolean;
    forced: boolean;
    policy: boolean;
    indexed: boolean;
  }>(
    adminUrl,
    `SELECT c.relname AS table, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
            EXISTS (
              SELECT 1 FROM pg_policies p
              WHERE p.schemaname = 'public' AND p.tablename = c.relname
                AND p.qual LIKE '%tenant_id%app_current_tenant_id()%'
                AND p.with_check LIKE '%tenant_id%app_current_tenant_id()%'
            ) AS policy,
            EXISTS (
              SELECT 1 FROM pg_index x
              JOIN pg_attribute ia ON ia.attrelid = c.oid AND ia.attnum = x.indkey[0]
              WHERE x.indrelid = c.oid AND ia.attname = 'tenant_id'
            ) AS indexed
     FROM pg_class c
     WHERE c.oid = ANY (SELECT ('public.' || quote_ident(t))::regclass FROM unnest($1::text[]) t)
     ORDER BY c.relname`,
    [await tenantTables(adminUrl)],
  );
  return rows.flatMap((r) => [
    ...(r.rls ? [] : [`${r.table}: row-level security is not enabled`]),
    ...(r.forced ? [] : [`${r.table}: row-level security is not forced`]),
    ...(r.policy
      ? []
      : [
          `${r.table}: no policy compares tenant_id with app_current_tenant_id() in USING and WITH CHECK`,
        ]),
    ...(r.indexed ? [] : [`${r.table}: no index starts with tenant_id`]),
  ]);
}
