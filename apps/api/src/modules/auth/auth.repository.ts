import { Inject, Injectable } from '@nestjs/common';
import {
  emailTokens,
  memberships,
  refreshTokens,
  securityEvents,
  tenants,
  users,
  type Database,
  type EmailTokenPurpose,
  type SecurityEventType,
  and,
  eq,
  gt,
  isNull,
} from '@setubandh/db';
import { DATABASE } from '../../core/database';

export interface RequestMeta {
  ip: string;
  userAgent: string | undefined;
}

/** Platform-scope persistence for accounts and sessions (requirements §11.2; no RLS). */
@Injectable()
export class AuthRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  findUserByEmail(email: string) {
    return this.db.platform.query.users.findFirst({ where: eq(users.email, email) });
  }

  findUserById(id: string) {
    return this.db.platform.query.users.findFirst({ where: eq(users.id, id) });
  }

  /** User + first workspace + Owner membership, atomically. */
  createAccount(input: {
    name: string;
    email: string;
    passwordHash: string;
    workspace: { name: string; slug: string; timezone: string; country: string; currency: string };
  }) {
    return this.db.platform.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ name: input.name, email: input.email, passwordHash: input.passwordHash })
        .returning();
      const [tenant] = await tx
        .insert(tenants)
        .values({ ...input.workspace, status: 'trialing' })
        .returning({ id: tenants.id });
      await tx
        .insert(memberships)
        .values({ userId: user!.id, tenantId: tenant!.id, role: 'owner' });
      return { user: user!, tenantId: tenant!.id };
    });
  }

  async markEmailVerified(userId: string, at: Date): Promise<void> {
    await this.db.platform.update(users).set({ emailVerifiedAt: at }).where(eq(users.id, userId));
  }

  async recordLogin(userId: string, at: Date): Promise<void> {
    await this.db.platform.update(users).set({ lastLoginAt: at }).where(eq(users.id, userId));
  }

  // --- refresh tokens -------------------------------------------------------------------------

  async insertRefreshToken(row: typeof refreshTokens.$inferInsert): Promise<void> {
    await this.db.platform.insert(refreshTokens).values(row);
  }

  findRefreshToken(tokenHash: string) {
    return this.db.platform.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, tokenHash),
    });
  }

  /** Mark a token as rotated, only if nobody rotated or revoked it first (race-safe). */
  async markReplaced(id: string, at: Date): Promise<boolean> {
    const rows = await this.db.platform
      .update(refreshTokens)
      .set({ replacedAt: at })
      .where(
        and(
          eq(refreshTokens.id, id),
          isNull(refreshTokens.replacedAt),
          isNull(refreshTokens.revokedAt),
        ),
      )
      .returning({ id: refreshTokens.id });
    return rows.length === 1;
  }

  async revokeFamily(userId: string, familyId: string, at: Date): Promise<void> {
    await this.db.platform
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.db.platform
      .update(refreshTokens)
      .set({ revokedAt: at })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  // --- email tokens ---------------------------------------------------------------------------

  async insertEmailToken(row: typeof emailTokens.$inferInsert): Promise<void> {
    await this.db.platform.insert(emailTokens).values(row);
  }

  /** Consume a valid, unused, unexpired link token; returns its user id or null. Single use. */
  async consumeEmailToken(
    tokenHash: string,
    purpose: EmailTokenPurpose,
    now: Date,
  ): Promise<string | null> {
    const rows = await this.db.platform
      .update(emailTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailTokens.tokenHash, tokenHash),
          eq(emailTokens.purpose, purpose),
          isNull(emailTokens.usedAt),
          gt(emailTokens.expiresAt, now),
        ),
      )
      .returning({ userId: emailTokens.userId });
    return rows[0]?.userId ?? null;
  }

  // --- security events ------------------------------------------------------------------------

  async recordSecurityEvent(
    type: SecurityEventType,
    userId: string | null,
    meta: RequestMeta,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.db.platform
      .insert(securityEvents)
      .values({ type, userId, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 500), metadata });
  }
}
