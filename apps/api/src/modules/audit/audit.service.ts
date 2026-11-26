import { Inject, Injectable } from '@nestjs/common';
import { auditLogs, platformAuditLogs, type AuditActorType, type Database } from '@setubandh/db';
import type { AuditAction, PlatformAuditAction } from '@setubandh/shared';
import { DATABASE } from '../../core/database';

export interface AuditEntry {
  tenantId: string;
  actor: { type: AuditActorType; id: string | null };
  action: AuditAction;
  target?: { type: string; id: string };
  /** Facts about the change. Never message bodies, tokens or secrets (rule 7). */
  metadata?: Record<string, unknown>;
  ip?: string;
}

/** The tenant audit log (FR-AUD-01): append-only, written inside the tenant's RLS scope. */
@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(entry: AuditEntry): Promise<void> {
    const userId = entry.actor.type === 'user' ? entry.actor.id : null;
    await this.db.withTenant(entry.tenantId, userId, (tx) =>
      tx.insert(auditLogs).values({
        tenantId: entry.tenantId,
        actorType: entry.actor.type,
        actorId: entry.actor.id,
        action: entry.action,
        targetType: entry.target?.type,
        targetId: entry.target?.id,
        metadata: entry.metadata ?? {},
        ip: entry.ip,
      }),
    );
  }
}

export interface PlatformAuditEntry {
  adminId: string;
  tenantId?: string;
  action: PlatformAuditAction;
  target?: { type: string; id: string };
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  /** Every platform action needs a reason (requirements §6.3). */
  reason: string;
  ip?: string;
}

/** The platform audit log (FR-AUD-02). Its callers arrive with admin lite (M1-30). */
@Injectable()
export class PlatformAuditService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(entry: PlatformAuditEntry): Promise<void> {
    if (!entry.reason.trim()) throw new Error('A platform audit entry needs a reason');
    await this.db.platform.insert(platformAuditLogs).values({
      adminId: entry.adminId,
      tenantId: entry.tenantId,
      action: entry.action,
      targetType: entry.target?.type,
      targetId: entry.target?.id,
      before: entry.before,
      after: entry.after,
      reason: entry.reason,
      ip: entry.ip,
    });
  }
}
