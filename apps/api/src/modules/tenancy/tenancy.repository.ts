import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  gt,
  invitations,
  isNull,
  memberships,
  securityEvents,
  tenants,
  users,
  type Database,
  type InvitationRole,
  type SecurityEventType,
} from '@setubandh/db';
import { AppError, type MembershipRole } from '@setubandh/shared';
import { DATABASE } from '../../core/database';
import type { RequestMeta } from '../auth';

type TenantInsert = typeof tenants.$inferInsert;

/**
 * Workspaces, memberships and invitations: platform scope (requirements §11.2), so no RLS here.
 * Every query names the tenant explicitly; workspace data tables use `db.withTenant()`.
 */
@Injectable()
export class TenancyRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The caller's active membership plus the settings that shape permissions. One indexed lookup. */
  async findActiveMembership(userId: string, tenantId: string) {
    const [row] = await this.db.platform
      .select({
        id: memberships.id,
        role: memberships.role,
        agentsSeeAllConversations: tenants.agentsSeeAllConversations,
      })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.tenantId, tenantId),
          eq(memberships.status, 'active'),
        ),
      )
      .limit(1);
    return row;
  }

  listWorkspacesForUser(userId: string) {
    return this.db.platform
      .select({ id: tenants.id, name: tenants.name, role: memberships.role })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')))
      .orderBy(asc(tenants.name));
  }

  findUser(userId: string) {
    return this.db.platform.query.users.findFirst({ where: eq(users.id, userId) });
  }

  findUserByEmail(email: string) {
    return this.db.platform.query.users.findFirst({ where: eq(users.email, email) });
  }

  async setLastTenant(userId: string, tenantId: string): Promise<void> {
    await this.db.platform
      .update(users)
      .set({ lastTenantId: tenantId })
      .where(eq(users.id, userId));
  }

  /** New workspace with the user as Owner. The user row is locked so the cap cannot be raced. */
  createWorkspace(userId: string, tenant: Omit<TenantInsert, 'id'>, maxOwned: number) {
    return this.db.platform.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
      const [owned] = await tx
        .select({ n: count() })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.role, 'owner')));
      if ((owned?.n ?? 0) >= maxOwned) throw new AppError('WORKSPACE_LIMIT_REACHED');
      const [created] = await tx.insert(tenants).values(tenant).returning();
      await tx.insert(memberships).values({ userId, tenantId: created!.id, role: 'owner' });
      return created!;
    });
  }

  findTenant(tenantId: string) {
    return this.db.platform.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  }

  async updateTenant(
    tenantId: string,
    changes: Partial<Pick<TenantInsert, 'name' | 'timezone' | 'agentsSeeAllConversations'>>,
  ) {
    if (Object.keys(changes).length === 0) return this.findTenant(tenantId);
    const [row] = await this.db.platform
      .update(tenants)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return row;
  }

  // --- members --------------------------------------------------------------------------------

  listMembers(tenantId: string) {
    return this.db.platform
      .select({
        id: memberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: memberships.role,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.status, 'active')))
      .orderBy(asc(memberships.createdAt));
  }

  findMember(tenantId: string, memberId: string) {
    return this.db.platform.query.memberships.findFirst({
      where: and(eq(memberships.tenantId, tenantId), eq(memberships.id, memberId)),
    });
  }

  findMembershipOfUser(tenantId: string, userId: string) {
    return this.db.platform.query.memberships.findFirst({
      where: and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)),
    });
  }

  async updateMemberRole(memberId: string, role: MembershipRole): Promise<void> {
    await this.db.platform
      .update(memberships)
      .set({ role, updatedAt: new Date() })
      .where(eq(memberships.id, memberId));
  }

  async deleteMember(memberId: string): Promise<void> {
    await this.db.platform.delete(memberships).where(eq(memberships.id, memberId));
  }

  /** Swap roles atomically: the old Owner becomes Admin first (one Owner per workspace index). */
  async transferOwnership(fromMemberId: string, toMemberId: string): Promise<void> {
    await this.db.platform.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(memberships)
        .set({ role: 'admin', updatedAt: now })
        .where(eq(memberships.id, fromMemberId));
      await tx
        .update(memberships)
        .set({ role: 'owner', updatedAt: now })
        .where(eq(memberships.id, toMemberId));
    });
  }

  // --- invitations ----------------------------------------------------------------------------

  /** A new invite replaces any open one for the same email in this workspace. */
  createInvitation(row: {
    tenantId: string;
    email: string;
    role: InvitationRole;
    tokenHash: string;
    expiresAt: Date;
    invitedBy: string;
  }) {
    return this.db.platform.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(invitations)
        .set({ revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(invitations.tenantId, row.tenantId),
            eq(invitations.email, row.email),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
          ),
        );
      const [created] = await tx.insert(invitations).values(row).returning();
      return created!;
    });
  }

  listOpenInvitations(tenantId: string, now: Date) {
    return this.db.platform
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
          gt(invitations.expiresAt, now),
        ),
      )
      .orderBy(asc(invitations.createdAt));
  }

  findOpenInvitation(tenantId: string, invitationId: string) {
    return this.db.platform.query.invitations.findFirst({
      where: and(
        eq(invitations.tenantId, tenantId),
        eq(invitations.id, invitationId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    });
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    const now = new Date();
    await this.db.platform
      .update(invitations)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(invitations.id, invitationId));
  }

  async renewInvitation(invitationId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.platform
      .update(invitations)
      .set({ tokenHash, expiresAt, updatedAt: new Date() })
      .where(eq(invitations.id, invitationId));
  }

  /** An invite that can still be accepted: not used, not revoked, not expired. */
  findUsableInvitation(tokenHash: string, now: Date) {
    return this.db.platform.query.invitations.findFirst({
      where: and(
        eq(invitations.tokenHash, tokenHash),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, now),
      ),
    });
  }

  /**
   * Accept atomically: mark the invite used (only if still usable), optionally create the user,
   * and add the membership. Returns null when someone else used the invite first.
   */
  acceptInvitation(input: {
    invitationId: string;
    now: Date;
    existingUserId?: string;
    newUser?: { name: string; email: string; passwordHash: string };
  }) {
    return this.db.platform.transaction(async (tx) => {
      const [invite] = await tx
        .update(invitations)
        .set({ acceptedAt: input.now, updatedAt: input.now })
        .where(
          and(
            eq(invitations.id, input.invitationId),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, input.now),
          ),
        )
        .returning();
      if (!invite) return null;
      let user: typeof users.$inferSelect | undefined;
      if (input.newUser) {
        [user] = await tx
          .insert(users)
          .values({ ...input.newUser, emailVerifiedAt: input.now, lastTenantId: invite.tenantId })
          .returning();
      } else {
        [user] = await tx
          .update(users)
          .set({ lastTenantId: invite.tenantId })
          .where(eq(users.id, input.existingUserId!))
          .returning();
      }
      await tx
        .insert(memberships)
        .values({ userId: user!.id, tenantId: invite.tenantId, role: invite.role })
        .onConflictDoNothing();
      return { invite, user: user! };
    });
  }

  // --- security events (until the M1-12 audit log) ---------------------------------------------

  async recordSecurityEvent(
    type: SecurityEventType,
    userId: string,
    meta: RequestMeta,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.db.platform
      .insert(securityEvents)
      .values({ type, userId, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 500), metadata });
  }
}
