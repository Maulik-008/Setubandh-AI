import {
  createParamDecorator,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AppError,
  permissionsFor,
  WORKSPACE_ID_HEADER,
  z,
  type AvailabilityStatus,
  type MembershipRole,
  type Permission,
} from '@setubandh/shared';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC, IS_USER_SCOPED, REQUIRED_PERMISSIONS } from '../../core/access';
import type { AuthUser } from '../auth';
import { TenancyRepository } from './tenancy.repository';

/** The workspace a request acts in, after the membership check (requirements §5.2). */
export interface WorkspaceContext {
  tenantId: string;
  membershipId: string;
  role: MembershipRole;
  permissions: Permission[];
  availability: AvailabilityStatus;
}

type TenantRequest = FastifyRequest & {
  user?: AuthUser;
  tenantId?: string;
  workspace?: WorkspaceContext;
};

const workspaceId = z.uuid();

/** The current workspace, set by TenantGuard. */
export const CurrentWorkspace = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): WorkspaceContext =>
    ctx.switchToHttp().getRequest<TenantRequest>().workspace!,
);

/**
 * Global guard, after AuthGuard. Workspace routes name their workspace in `X-Workspace-Id`; the
 * caller's membership is read from the database on every request (no cache), so removing a member
 * takes effect on their very next call. Then the route's permissions are checked (rule 3).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly repo: TenancyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(IS_USER_SCOPED, targets)) return true;
    // Undeclared routes are treated as workspace routes (fail closed); a test forbids them anyway.
    const required =
      this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS, targets) ?? [];

    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.user) throw new AppError('UNAUTHENTICATED');
    const parsed = workspaceId.safeParse(request.headers[WORKSPACE_ID_HEADER]);
    if (!parsed.success) throw new AppError('WORKSPACE_REQUIRED');

    const membership = await this.repo.findActiveMembership(request.user.id, parsed.data);
    if (!membership) throw new AppError('WORKSPACE_NOT_MEMBER');
    const permissions = permissionsFor(membership.role, membership);
    const missing = required.find((p) => !permissions.includes(p));
    if (missing) throw new AppError('FORBIDDEN', { details: { permission: missing } });

    request.tenantId = parsed.data; // also lands in every log line (§14.6)
    (request.raw as { tenantId?: string }).tenantId = parsed.data;
    request.workspace = {
      tenantId: parsed.data,
      membershipId: membership.id,
      role: membership.role,
      permissions,
      availability: membership.availability,
    };
    return true;
  }
}
