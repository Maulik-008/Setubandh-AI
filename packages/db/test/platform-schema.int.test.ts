import { createTestDatabase, type TestDatabase } from '@setubandh/testing';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  createDatabase,
  DEMO_TENANT_SLUG,
  memberships,
  migrate,
  seed,
  tenants,
  users,
  type Database,
} from '../src/index';

describe('platform tables: tenants, users, memberships (requirements §11.2)', () => {
  let testDb: TestDatabase;
  let db: Database;
  let appUrl: string;

  beforeAll(async () => {
    testDb = await createTestDatabase(inject('postgresUrl'));
    appUrl = testDb.appUrl;
    await migrate({ adminUrl: testDb.adminUrl, appUrl });
    db = createDatabase(appUrl);
  }, 120_000);

  afterAll(async () => {
    await db?.close();
    await testDb?.drop();
  });

  const newTenant = (overrides: Partial<typeof tenants.$inferInsert> = {}) => ({
    name: 'Asha Boutique',
    slug: `asha-${uuidv7()}`,
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    ...overrides,
  });

  it('generates time-ordered UUIDv7 ids and defaults a new tenant to trialing', async () => {
    const [first] = await db.platform.insert(tenants).values(newTenant()).returning();
    const [second] = await db.platform.insert(tenants).values(newTenant()).returning();
    expect(first?.id).toMatch(/^[0-9a-f-]{14}7/);
    expect(first!.id < second!.id).toBe(true);
    expect(first?.status).toBe('trialing');
  });

  it('rejects a tenant status outside the lifecycle', async () => {
    await expect(
      db.platform.insert(tenants).values(newTenant({ status: 'paused' as never })),
    ).rejects.toThrow();
  });

  it('treats user emails as case-insensitive and unique', async () => {
    await db.platform.insert(users).values({ email: 'Asha@Example.com', name: 'Asha' });
    await expect(
      db.platform.insert(users).values({ email: 'asha@example.COM', name: 'Other' }),
    ).rejects.toThrow();
    const found = await db.platform.select().from(users).where(eq(users.email, 'ASHA@example.com'));
    expect(found).toHaveLength(1);
  });

  it('allows one membership per user per workspace, with a valid role', async () => {
    const [tenant] = await db.platform.insert(tenants).values(newTenant()).returning();
    const [user] = await db.platform
      .insert(users)
      .values({ email: `${uuidv7()}@example.com`, name: 'Ravi' })
      .returning();
    await db.platform
      .insert(memberships)
      .values({ userId: user!.id, tenantId: tenant!.id, role: 'agent' });
    await expect(
      db.platform
        .insert(memberships)
        .values({ userId: user!.id, tenantId: tenant!.id, role: 'admin' }),
    ).rejects.toThrow();
    await expect(
      db.platform.insert(memberships).values({
        userId: user!.id,
        tenantId: (await db.platform.insert(tenants).values(newTenant()).returning())[0]!.id,
        role: 'boss' as never,
      }),
    ).rejects.toThrow();
  });

  it('can run the migrations again without changes or errors', async () => {
    await expect(migrate({ adminUrl: testDb.adminUrl, appUrl })).resolves.toBeUndefined();
  });

  it('refuses a DATABASE_URL that does not use the orbit_app role', async () => {
    await expect(
      migrate({ adminUrl: testDb.adminUrl, appUrl: testDb.urlFor('postgres', 'x') }),
    ).rejects.toThrow(/orbit_app/);
  });
});

describe('seed', () => {
  it('creates the demo workspace once (idempotent)', async () => {
    const testDb = await createTestDatabase(inject('postgresUrl'));
    await migrate({ adminUrl: testDb.adminUrl, appUrl: testDb.appUrl });
    const db = createDatabase(testDb.appUrl);
    try {
      const first = await seed(db);
      const second = await seed(db);
      expect(second.tenantId).toBe(first.tenantId);
      const rows = await db.platform
        .select()
        .from(tenants)
        .where(eq(tenants.slug, DEMO_TENANT_SLUG));
      expect(rows).toHaveLength(1);
    } finally {
      await db.close();
      await testDb.drop();
    }
  }, 120_000);
});
