import { eq } from 'drizzle-orm';
import type { Database } from './client';
import { tenants } from './schema';

export const DEMO_TENANT_SLUG = 'demo';

/**
 * Local demo data. Idempotent: running it twice changes nothing. Users and memberships arrive
 * with auth (M1-09, which owns password hashing).
 */
export async function seed(db: Database): Promise<{ tenantId: string }> {
  const existing = await db.platform
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, DEMO_TENANT_SLUG));
  if (existing[0]) return { tenantId: existing[0].id };
  const [tenant] = await db.platform
    .insert(tenants)
    .values({
      name: 'Demo Boutique',
      slug: DEMO_TENANT_SLUG,
      status: 'active',
      country: 'IN',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      industry: 'retail',
    })
    .returning({ id: tenants.id });
  return { tenantId: tenant!.id };
}
