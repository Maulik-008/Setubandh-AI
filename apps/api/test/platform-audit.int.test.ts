import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { adminQuery } from '@setubandh/testing';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PlatformAuditService } from '../src/modules/audit';
import { bootAuthApi, type AuthTestApp } from './support/auth-app';

// FR-AUD-02: the platform audit service (its callers arrive with admin lite, M1-30).
describe('PlatformAuditService', () => {
  let t: AuthTestApp;
  let app: NestFastifyApplication;
  beforeAll(async () => {
    t = await bootAuthApi();
    app = t.app;
  }, 120_000);
  afterAll(async () => {
    await t?.close();
  });

  it('appends an entry with before, after and reason', async () => {
    const adminId = randomUUID();
    await app.get(PlatformAuditService).record({
      adminId,
      action: 'tenant.change_limits',
      target: { type: 'tenant', id: 'x' },
      before: { members: 5 },
      after: { members: 8 },
      reason: 'Pilot customer asked for more seats',
      ip: '10.0.0.1',
    });
    const rows = await adminQuery(
      t.db.adminUrl,
      `SELECT action, before, after, reason FROM platform_audit_logs WHERE admin_id = $1::uuid`,
      [adminId],
    );
    expect(rows).toEqual([
      {
        action: 'tenant.change_limits',
        before: { members: 5 },
        after: { members: 8 },
        reason: 'Pilot customer asked for more seats',
      },
    ]);
  });

  it('refuses an entry without a reason', async () => {
    await expect(
      app
        .get(PlatformAuditService)
        .record({ adminId: randomUUID(), action: 'tenant.suspend', reason: '  ' }),
    ).rejects.toThrow(/reason/);
  });
});
