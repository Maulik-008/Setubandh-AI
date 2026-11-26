import { Controller, Get, HttpCode, Patch, Post, Put, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  createWorkspaceRequestSchema,
  lastWorkspaceRequestSchema,
  updateWorkspaceRequestSchema,
  type CreateWorkspaceRequest,
  type LastWorkspaceRequest,
  type UpdateWorkspaceRequest,
  type WorkspaceListResponse,
  type WorkspaceResponse,
  type WorkspaceSummary,
} from '@setubandh/shared';
import { RequirePermission, UserScoped } from '../../core/access';
import { ZodBody } from '../../core/validation';
import { CurrentUser, type AuthUser } from '../auth';
import { CurrentWorkspace, type WorkspaceContext } from './tenant.guard';
import { WorkspacesService } from './workspaces.service';

/** My workspaces, for the switcher. Not inside a workspace, so no X-Workspace-Id. */
@UserScoped()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<WorkspaceListResponse> {
    return this.workspaces.listMine(user.id);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createWorkspaceRequestSchema) body: CreateWorkspaceRequest,
  ): Promise<WorkspaceSummary> {
    return this.workspaces.create(user.id, body);
  }
}

/** The workspace named in X-Workspace-Id. */
@Controller('workspace')
export class CurrentWorkspaceController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @RequirePermission()
  get(@CurrentWorkspace() ws: WorkspaceContext): Promise<WorkspaceResponse> {
    return this.workspaces.get(ws);
  }

  @Patch()
  @RequirePermission('workspace.settings')
  update(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodBody(updateWorkspaceRequestSchema) body: UpdateWorkspaceRequest,
    @Req() req: FastifyRequest,
  ): Promise<WorkspaceResponse> {
    return this.workspaces.update(ws, user.id, body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}

/** Remembers the switcher's choice (FR-AUTH-07). */
@UserScoped()
@Controller('me')
export class LastWorkspaceController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Put('last-workspace')
  @HttpCode(204)
  async remember(
    @CurrentUser() user: AuthUser,
    @ZodBody(lastWorkspaceRequestSchema) body: LastWorkspaceRequest,
  ): Promise<void> {
    await this.workspaces.rememberLast(user.id, body.workspaceId);
  }
}
