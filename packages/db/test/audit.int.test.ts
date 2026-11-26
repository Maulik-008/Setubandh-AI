import { adminQuery, createTestDatabase, type TestDatabase } from '@setubandh/testing';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { auditLogs, createDatabase, migrate, platformAuditLogs, type Database } from '../src/index';

// M1-12 acceptance: the audit tables are append-only for the app role, and partitioned by month.

describe('audit logs (FR-AUD-01..03, requirements §11.2)', () => {
  let testDb: TestDatabase;
  let db: Database;
  const tenantA = uuidv7();
  const tenantB = uuidv7();

  beforeAll(async () => {
    testDb = await createTestDatabase(inject('postgresUrl'));
    await migrate({ adminUrl: testDb.adminUrl, appUrl: testDb.appUrl });
    await adminQuery(
      testDb.adminUrl,
      `INSERT INTO tenants (id, name, slug, status, country, currency, timezone)
       VALUES ($1::uuid, 'A', 'a-' || $1::text, 'active', 'IN', 'INR', 'Asia/Kolkata'),
              ($2::uuid, 'B', 'b-' || $2::text, 'active', 'IN', 'INR', 'Asia/Kolkata')`,
      [tenantA, tenantB],
    );
    db = createDatabase(testDb.appUrl);
    await db.withTenant(tenantA, null, (tx) =>
      tx
        .insert(auditLogs)
        .values({ tenantId: tenantA, actorType: 'system', action: 'test.created' }),
    );
    await db.platform
      .insert(platformAuditLogs)
      .values({ adminId: uuidv7(), tenantId: tenantA, action: 'tenant.suspend', reason: 'test' });
  }, 120_000);

  afterAll(async () => {
    await db?.close();
    await testDb?.drop();
  });

  /** SQLSTATE 42501 (insufficient_privilege), however Drizzle wraps it. */
  async function expectDenied(promise: Promise<unknown>) {
    const error = await promise.then(
      () => undefined,
      (e: unknown) => e as Error & { cause?: { code?: string } },
    );
    expect(error, 'expected the statement to be refused').toBeInstanceOf(Error);
    expect(error!.cause?.code ?? (error as { code?: string }).code).toBe('42501');
  }

  const currentPartition = (table: string) => {
    const now = new Date();
    return `${table}_${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  describe('AC: update / delete on audit tables is denied for orbit_app', () => {
    for (const table of ['audit_logs', 'platform_audit_logs', 'security_events']) {
      it(`refuses UPDATE, DELETE and TRUNCATE on ${table}`, async () => {
        const run = (statement: string) =>
          db.withTenant(tenantA, null, (tx) => tx.execute(sql.raw(statement)));
        await expectDenied(run(`UPDATE ${table} SET created_at = now()`));
        await expectDenied(run(`DELETE FROM ${table}`));
        await expectDenied(run(`TRUNCATE ${table}`));
      });
    }

    it('refuses any direct access to a partition', async () => {
      for (const table of ['audit_logs', 'platform_audit_logs']) {
        const part = currentPartition(table);
        await expectDenied(db.platform.execute(sql.raw(`SELECT * FROM ${part}`)));
        await expectDenied(db.platform.execute(sql.raw(`DELETE FROM ${part}`)));
      }
    });

    it('still allows reading and appending', async () => {
      const rows = await db.withTenant(tenantA, null, (tx) => tx.select().from(auditLogs));
      expect(rows.map((r) => r.action)).toContain('test.created');
      expect((await db.platform.select().from(platformAuditLogs)).length).toBe(1);
    });
  });

  it("keeps one tenant's audit rows away from another (RLS)", async () => {
    const asB = await db.withTenant(tenantB, null, (tx) => tx.select().from(auditLogs));
    expect(asB).toEqual([]);
    const sneaky = db.withTenant(tenantB, null, (tx) =>
      tx.insert(auditLogs).values({ tenantId: tenantA, actorType: 'user', action: 'test.sneaky' }),
    );
    await expectDenied(sneaky);
  });

  it('stores rows in the monthly partition and outside months in the default partition', async () => {
    const counts = await adminQuery<{ part: string; n: number }>(
      testDb.adminUrl,
      `SELECT tableoid::regclass::text AS part, count(*)::int AS n FROM audit_logs GROUP BY 1`,
    );
    expect(counts).toEqual([{ part: currentPartition('audit_logs'), n: 1 }]);
    await db.withTenant(tenantA, null, (tx) =>
      tx.insert(auditLogs).values({
        tenantId: tenantA,
        actorType: 'system',
        action: 'test.future',
        createdAt: new Date(Date.UTC(2099, 0, 1)),
      }),
    );
    const future = await adminQuery<{ part: string }>(
      testDb.adminUrl,
      `SELECT tableoid::regclass::text AS part FROM audit_logs WHERE action = 'test.future'`,
    );
    expect(future).toEqual([{ part: 'audit_logs_default' }]);
  });

  it('prepares partitions 3 months ahead; the maintenance function is idempotent and callable by the app', async () => {
    const run = async () =>
      (
        await db.platform.execute<{ created: number }>(
          sql`SELECT app_ensure_audit_partitions(3) AS created`,
        )
      ).rows[0]!.created;
    expect(await run()).toBe(0); // the migration already created them
    const parts = await adminQuery<{ name: string }>(
      testDb.adminUrl,
      `SELECT c.relname AS name FROM pg_inherits i
       JOIN pg_class c ON c.oid = i.inhrelid
       WHERE i.inhparent = 'audit_logs'::regclass AND c.relname <> 'audit_logs_default'`,
    );
    expect(parts).toHaveLength(4);
    expect(parts.map((p) => p.name)).toContain(currentPartition('audit_logs'));
    // Concurrent runs (two workers) are serialised by an advisory lock.
    const results = await Promise.all([run(), run(), run()]);
    expect(results).toEqual([0, 0, 0]);
  });

  it('refuses a nonsense horizon', async () => {
    await expect(
      db.platform.execute(sql`SELECT app_ensure_audit_partitions(100)`),
    ).rejects.toThrow();
  });
});
