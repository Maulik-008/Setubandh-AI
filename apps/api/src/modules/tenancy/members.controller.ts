import { Controller, Delete, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import {
  transferOwnershipRequestSchema,
  updateAvailabilityRequestSchema,
  updateMemberRequestSchema,
  z,
  type MemberListResponse,
  type TransferOwnershipRequest,
  type UpdateAvailabilityRequest,
  type UpdateMemberRequest,
} from '@setubandh/shared';
import type { FastifyRequest } from 'fastify';
import { RequirePermission } from '../../core/access';
import { ZodBody, ZodParams } from '../../core/validation';
import { CurrentUser, type AuthUser } from '../auth';
import { MembersService } from './members.service';
import { CurrentWorkspace, type WorkspaceContext } from './tenant.guard';

const idParams = z.object({ id: z.uuid() });
const meta = (req: FastifyRequest) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @RequirePermission()
  list(@CurrentWorkspace() ws: WorkspaceContext): Promise<MemberListResponse> {
    return this.members.list(ws);
  }

  @Patch('me')
  @HttpCode(200)
  @RequirePermission()
  async setMyAvailability(
    @CurrentWorkspace() ws: WorkspaceContext,
    @ZodBody(updateAvailabilityRequestSchema) body: UpdateAvailabilityRequest,
  ): Promise<UpdateAvailabilityRequest> {
    await this.members.setMyAvailability(ws, body.availability);
    return { availability: body.availability };
  }

  @Patch(':id')
  @HttpCode(204)
  @RequirePermission('members.manage')
  async changeRole(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodParams(idParams) params: { id: string },
    @ZodBody(updateMemberRequestSchema) body: UpdateMemberRequest,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.members.changeRole(ws, user.id, params.id, body.role, meta(req));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('members.manage')
  async remove(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodParams(idParams) params: { id: string },
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.members.remove(ws, user.id, params.id, meta(req));
  }
}

@Controller('workspace')
export class OwnershipController {
  constructor(private readonly members: MembersService) {}

  @Post('transfer-ownership')
  @HttpCode(200)
  @RequirePermission('workspace.transfer_ownership')
  async transfer(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodBody(transferOwnershipRequestSchema) body: TransferOwnershipRequest,
    @Req() req: FastifyRequest,
  ) {
    await this.members.transferOwnership(ws, user.id, body.memberId, meta(req));
    return { status: 'transferred' as const };
  }
}
