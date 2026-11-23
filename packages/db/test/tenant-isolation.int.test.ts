import { createTestDatabase, type TestDatabase } from '@setubandh/testing';
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
    const { rows } = await db.platform.execute<{
      table: string;
      rls: boolean;
      forced: boolean;
      policies: number;
    }>(sql`
      SELECT c.relname AS table, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
             (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = c.relname) AS policies
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
      WHERE c.relkind IN ('r', 'p')
        AND c.relname NOT IN (${sql.join(
          PLATFORM_TABLES_WITH_TENANT_ID.map((t) => sql`${t}`),
          sql`, `,
        )})
    `);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row, row.table).toMatchObject({ rls: true, forced: true });
      expect(row.policies, row.table).toBeGreaterThan(0);
    }
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

/** Platform-scope tables (requirements §11.2) that reference a tenant but are not RLS-protected. */
const PLATFORM_TABLES_WITH_TENANT_ID = ['memberships'];
