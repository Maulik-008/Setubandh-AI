import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  acceptInvitationRequestSchema,
  acceptInviteNewAccountRequestSchema,
  createInvitationRequestSchema,
  z,
  type AcceptedInvitationResponse,
  type AcceptInvitationRequest,
  type AcceptInviteNewAccountRequest,
  type CreateInvitationRequest,
  type Invitation,
  type InvitationListResponse,
  type SessionResponse,
} from '@setubandh/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public, RequirePermission, UserScoped } from '../../core/access';
import { ENV, type AppEnv } from '../../core/env';
import { ZodBody, ZodParams } from '../../core/validation';
import { AuthRateLimitGuard, CurrentUser, withSessionCookie, type AuthUser } from '../auth';
import { InvitationsService } from './invitations.service';
import { CurrentWorkspace, type WorkspaceContext } from './tenant.guard';

const idParams = z.object({ id: z.uuid() });
const meta = (req: FastifyRequest) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  @RequirePermission('members.manage')
  list(@CurrentWorkspace() ws: WorkspaceContext): Promise<InvitationListResponse> {
    return this.invitations.list(ws);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('members.manage')
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodBody(createInvitationRequestSchema) body: CreateInvitationRequest,
    @Req() req: FastifyRequest,
  ): Promise<Invitation> {
    return this.invitations.create(ws, user.id, body, meta(req));
  }

  @Post(':id/resend')
  @HttpCode(202)
  @RequirePermission('members.manage')
  async resend(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodParams(idParams) params: { id: string },
  ) {
    await this.invitations.resend(ws, user.id, params.id);
    return { status: 'accepted' as const };
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('members.manage')
  async revoke(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodParams(idParams) params: { id: string },
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.invitations.revoke(ws, user.id, params.id, meta(req));
  }

  /** A signed-in user accepts an invite sent to their email. */
  @Post('accept')
  @HttpCode(200)
  @UserScoped()
  accept(
    @CurrentUser() user: AuthUser,
    @ZodBody(acceptInvitationRequestSchema) body: AcceptInvitationRequest,
    @Req() req: FastifyRequest,
  ): Promise<AcceptedInvitationResponse> {
    return this.invitations.acceptAsUser(user.id, body.token, meta(req));
  }
}

/** Accept an invite without an account: creates it (email verified by the link) and signs in. */
@Public()
@UseGuards(AuthRateLimitGuard)
@Controller('auth')
export class AcceptInviteController {
  constructor(
    private readonly invitations: InvitationsService,
    @Inject(ENV) private readonly env: AppEnv,
  ) {}

  @Post('accept-invite')
  @HttpCode(200)
  async accept(
    @ZodBody(acceptInviteNewAccountRequestSchema) body: AcceptInviteNewAccountRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionResponse> {
    const issued = await this.invitations.acceptAsNewUser(body, meta(req));
    return withSessionCookie(reply, issued, this.env);
  }
}
