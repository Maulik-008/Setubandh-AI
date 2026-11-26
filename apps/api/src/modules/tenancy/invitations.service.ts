import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  type AcceptedInvitationResponse,
  type AcceptInviteNewAccountRequest,
  type CreateInvitationRequest,
  type Invitation,
  type InvitationListResponse,
} from '@setubandh/shared';
import { CLOCK, type Clock } from '../../core/clock';
import { ENV, type AppEnv } from '../../core/env';
import { MailerService } from '../../core/mailer';
import { AuditService } from '../audit';
import { AuthService, hashPassword, type IssuedSession, type RequestMeta } from '../auth';
import type { WorkspaceContext } from './tenant.guard';
import { TenancyRepository } from './tenancy.repository';

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type InvitationRow = NonNullable<Awaited<ReturnType<TenancyRepository['findOpenInvitation']>>>;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const toDto = (i: InvitationRow): Invitation => ({
  id: i.id,
  email: i.email,
  role: i.role,
  expiresAt: i.expiresAt.toISOString(),
  createdAt: i.createdAt.toISOString(),
});

/** Email invitations to a workspace (FR-AUTH-06): 7 days, single-use token link. */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly repo: TenancyRepository,
    private readonly auth: AuthService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: AppEnv,
  ) {}

  async list(ws: WorkspaceContext): Promise<InvitationListResponse> {
    const rows = await this.repo.listOpenInvitations(ws.tenantId, this.clock.now());
    return { invitations: rows.map(toDto) };
  }

  async create(
    ws: WorkspaceContext,
    inviterId: string,
    input: CreateInvitationRequest,
    meta: RequestMeta,
  ): Promise<Invitation> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing && (await this.repo.findActiveMembership(existing.id, ws.tenantId))) {
      throw new AppError('CONFLICT', { message: 'This person is already a member.' });
    }
    const token = randomBytes(32).toString('base64url');
    const invite = await this.repo.createInvitation({
      tenantId: ws.tenantId,
      email: input.email,
      role: input.role,
      tokenHash: hashToken(token),
      expiresAt: this.expiry(),
      invitedBy: inviterId,
    });
    await this.send(invite.email, ws.tenantId, inviterId, token);
    await this.audit.record({
      tenantId: ws.tenantId,
      actor: { type: 'user', id: inviterId },
      action: 'member.invited',
      target: { type: 'invitation', id: invite.id },
      metadata: { role: input.role },
      ip: meta.ip,
    });
    return toDto(invite);
  }

  /** New link, new 7 days; the previous link stops working. */
  async resend(ws: WorkspaceContext, inviterId: string, invitationId: string): Promise<void> {
    const invite = await this.repo.findOpenInvitation(ws.tenantId, invitationId);
    if (!invite) throw new AppError('NOT_FOUND');
    const token = randomBytes(32).toString('base64url');
    await this.repo.renewInvitation(invite.id, hashToken(token), this.expiry());
    await this.send(invite.email, ws.tenantId, inviterId, token);
  }

  async revoke(
    ws: WorkspaceContext,
    actorId: string,
    invitationId: string,
    meta: RequestMeta,
  ): Promise<void> {
    const invite = await this.repo.findOpenInvitation(ws.tenantId, invitationId);
    if (!invite) throw new AppError('NOT_FOUND');
    await this.repo.revokeInvitation(invite.id);
    await this.audit.record({
      tenantId: ws.tenantId,
      actor: { type: 'user', id: actorId },
      action: 'invitation.revoked',
      target: { type: 'invitation', id: invite.id },
      metadata: { role: invite.role },
      ip: meta.ip,
    });
  }

  /** A signed-in user accepts; the invite must be for their email. */
  async acceptAsUser(
    userId: string,
    token: string,
    meta: RequestMeta,
  ): Promise<AcceptedInvitationResponse> {
    const now = this.clock.now();
    const [invite, user] = await Promise.all([
      this.repo.findUsableInvitation(hashToken(token), now),
      this.repo.findUser(userId),
    ]);
    if (!invite || !user || invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new AppError('INVITATION_INVALID');
    }
    const accepted = await this.repo.acceptInvitation({
      invitationId: invite.id,
      now,
      existingUserId: user.id,
    });
    if (!accepted) throw new AppError('INVITATION_INVALID');
    await this.recordAccepted(invite, user.id, false, meta);
    return { workspaceId: invite.tenantId, role: invite.role };
  }

  /**
   * Someone without an account accepts: the account is created with a verified email (the link
   * proved it) and signed in like a login.
   */
  async acceptAsNewUser(
    input: AcceptInviteNewAccountRequest,
    meta: RequestMeta,
  ): Promise<IssuedSession> {
    const now = this.clock.now();
    const invite = await this.repo.findUsableInvitation(hashToken(input.token), now);
    if (!invite) throw new AppError('INVITATION_INVALID');
    if (await this.repo.findUserByEmail(invite.email)) {
      throw new AppError('INVITATION_INVALID', {
        message: 'An account already exists for this email. Sign in to accept the invitation.',
      });
    }
    await this.auth.assertPasswordAllowed(input.password);
    const accepted = await this.repo.acceptInvitation({
      invitationId: invite.id,
      now,
      newUser: {
        name: input.name,
        email: invite.email,
        passwordHash: await hashPassword(input.password),
      },
    });
    if (!accepted) throw new AppError('INVITATION_INVALID');
    await this.recordAccepted(invite, accepted.user.id, true, meta);
    return this.auth.startSession(accepted.user, meta);
  }

  private recordAccepted(
    invite: { id: string; tenantId: string; role: string },
    userId: string,
    newAccount: boolean,
    meta: RequestMeta,
  ) {
    return this.audit.record({
      tenantId: invite.tenantId,
      actor: { type: 'user', id: userId },
      action: 'invitation.accepted',
      target: { type: 'invitation', id: invite.id },
      metadata: { role: invite.role, newAccount },
      ip: meta.ip,
    });
  }

  private expiry(): Date {
    return new Date(this.clock.now().getTime() + INVITATION_TTL_MS);
  }

  private async send(email: string, tenantId: string, inviterId: string, token: string) {
    const [tenant, inviter] = await Promise.all([
      this.repo.findTenant(tenantId),
      this.repo.findUser(inviterId),
    ]);
    const link = `${this.env.APP_URL}/invite?token=${token}`;
    const who = inviter?.name ?? 'A teammate';
    const where = tenant?.name ?? 'their workspace';
    await this.mailer.send({
      to: email,
      subject: `${who} invited you to ${where} on Setubandh AI`,
      text: `${who} invited you to join ${where} on Setubandh AI. Accept within 7 days: ${link}`,
      html: `<p>${escapeHtml(who)} invited you to join <strong>${escapeHtml(where)}</strong> on Setubandh AI.</p><p><a href="${link}">Accept the invitation</a> (valid for 7 days).</p>`,
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
