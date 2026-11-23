import { Injectable } from '@nestjs/common';
import { AppError, type AssignableRole, type MemberListResponse } from '@setubandh/shared';
import type { RequestMeta } from '../auth';
import type { WorkspaceContext } from './tenant.guard';
import { TenancyRepository } from './tenancy.repository';

/**
 * Members and roles (requirements §6). The Owner is protected: an Admin can never change or remove
 * the Owner, and nobody removes the Owner; ownership moves only by transfer.
 */
@Injectable()
export class MembersService {
  constructor(private readonly repo: TenancyRepository) {}

  async list(ws: WorkspaceContext): Promise<MemberListResponse> {
    const rows = await this.repo.listMembers(ws.tenantId);
    return { members: rows.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() })) };
  }

  async changeRole(
    ws: WorkspaceContext,
    actorId: string,
    memberId: string,
    role: AssignableRole,
    meta: RequestMeta,
  ): Promise<void> {
    const target = await this.ownerSafeTarget(ws, memberId, 'change the role of');
    if (target.role === role) return;
    await this.repo.updateMemberRole(target.id, role);
    await this.repo.recordSecurityEvent('member_role_changed', actorId, meta, {
      tenantId: ws.tenantId,
      memberId: target.id,
      from: target.role,
      to: role,
    });
  }

  async remove(
    ws: WorkspaceContext,
    actorId: string,
    memberId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const target = await this.ownerSafeTarget(ws, memberId, 'remove');
    await this.repo.deleteMember(target.id);
    await this.repo.recordSecurityEvent('member_removed', actorId, meta, {
      tenantId: ws.tenantId,
      memberId: target.id,
      userId: target.userId,
    });
  }

  async transferOwnership(
    ws: WorkspaceContext,
    actorId: string,
    memberId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const target = await this.repo.findMember(ws.tenantId, memberId);
    if (!target || target.status !== 'active') throw new AppError('NOT_FOUND');
    if (target.id === ws.membershipId) {
      throw new AppError('CONFLICT', { message: 'You already own this workspace.' });
    }
    await this.repo.transferOwnership(ws.membershipId, target.id);
    await this.repo.recordSecurityEvent('ownership_transferred', actorId, meta, {
      tenantId: ws.tenantId,
      fromMemberId: ws.membershipId,
      toMemberId: target.id,
    });
  }

  private async ownerSafeTarget(ws: WorkspaceContext, memberId: string, action: string) {
    const target = await this.repo.findMember(ws.tenantId, memberId);
    if (!target) throw new AppError('NOT_FOUND');
    if (target.role === 'owner') {
      if (ws.role !== 'owner') {
        throw new AppError('FORBIDDEN', { message: `An Admin cannot ${action} the Owner.` });
      }
      throw new AppError('CONFLICT', {
        message: 'Transfer ownership to another member first.',
      });
    }
    return target;
  }
}
