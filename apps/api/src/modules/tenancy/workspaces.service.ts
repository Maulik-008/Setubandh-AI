import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AppError,
  MAX_OWNED_WORKSPACES,
  permissionsFor,
  type CreateWorkspaceRequest,
  type UpdateWorkspaceRequest,
  type WorkspaceListResponse,
  type WorkspaceResponse,
  type WorkspaceSummary,
} from '@setubandh/shared';
import { AuditService } from '../audit';
import { workspaceDefaults, workspaceSlug, type RequestMeta } from '../auth';
import type { WorkspaceContext } from './tenant.guard';
import { TenancyRepository } from './tenancy.repository';

/** Workspaces and the switcher (requirements §5.2, FR-AUTH-07). */
@Injectable()
export class WorkspacesService {
  constructor(
    private readonly repo: TenancyRepository,
    private readonly audit: AuditService,
  ) {}

  async listMine(userId: string): Promise<WorkspaceListResponse> {
    const [workspaces, user] = await Promise.all([
      this.repo.listWorkspacesForUser(userId),
      this.repo.findUser(userId),
    ]);
    const last = user?.lastTenantId;
    return {
      workspaces,
      lastWorkspaceId: last && workspaces.some((w) => w.id === last) ? last : null,
    };
  }

  async create(userId: string, input: CreateWorkspaceRequest): Promise<WorkspaceSummary> {
    const tenant = await this.repo.createWorkspace(
      userId,
      {
        name: input.name,
        slug: workspaceSlug(input.name, randomBytes(4).toString('hex')),
        status: 'trialing',
        ...workspaceDefaults(input.timezone),
      },
      MAX_OWNED_WORKSPACES,
    );
    return { id: tenant.id, name: tenant.name, role: 'owner' };
  }

  async get(ws: WorkspaceContext): Promise<WorkspaceResponse> {
    const tenant = await this.repo.findTenant(ws.tenantId);
    if (!tenant) throw new AppError('NOT_FOUND');
    return this.toResponse(tenant, ws);
  }

  async update(
    ws: WorkspaceContext,
    actorId: string,
    changes: UpdateWorkspaceRequest,
    meta: RequestMeta,
  ): Promise<WorkspaceResponse> {
    const before = await this.repo.findTenant(ws.tenantId);
    const tenant = await this.repo.updateTenant(ws.tenantId, changes);
    if (!before || !tenant) throw new AppError('NOT_FOUND');
    // Only changed fields, old and new values (none of them is secret).
    const changed = Object.fromEntries(
      (Object.keys(changes) as (keyof UpdateWorkspaceRequest)[])
        .filter((key) => before[key] !== tenant[key])
        .map((key) => [key, { from: before[key], to: tenant[key] }]),
    );
    if (Object.keys(changed).length > 0) {
      await this.audit.record({
        tenantId: ws.tenantId,
        actor: { type: 'user', id: actorId },
        action: 'workspace.settings_changed',
        target: { type: 'workspace', id: ws.tenantId },
        metadata: { changed },
        ip: meta.ip,
      });
    }
    return this.toResponse(tenant, ws);
  }

  async rememberLast(userId: string, tenantId: string): Promise<void> {
    if (!(await this.repo.findActiveMembership(userId, tenantId))) {
      throw new AppError('WORKSPACE_NOT_MEMBER');
    }
    await this.repo.setLastTenant(userId, tenantId);
  }

  private toResponse(
    tenant: NonNullable<Awaited<ReturnType<TenancyRepository['findTenant']>>>,
    ws: WorkspaceContext,
  ): WorkspaceResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      timezone: tenant.timezone,
      country: tenant.country,
      currency: tenant.currency,
      agentsSeeAllConversations: tenant.agentsSeeAllConversations,
      role: ws.role,
      // Recomputed so a settings change shows up in the same response.
      permissions: permissionsFor(ws.role, tenant),
      availability: ws.availability,
    };
  }
}
