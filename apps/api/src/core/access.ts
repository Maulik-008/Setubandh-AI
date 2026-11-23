import { SetMetadata, type INestApplication } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import type { Permission } from '@setubandh/shared';

// Who may call a route (rule 3). Every route declares exactly one of these; a test walks all routes.

export const IS_PUBLIC = 'access:public';
export const IS_USER_SCOPED = 'access:user-scoped';
export const REQUIRED_PERMISSIONS = 'access:permissions';

/** No access token needed (signup, login, health, webhooks). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Signed in, but not acting inside a workspace (/v1/me, the workspace list, accepting an invite). */
export const UserScoped = () => SetMetadata(IS_USER_SCOPED, true);
/**
 * Workspace route: needs `X-Workspace-Id`, an active membership and every listed permission.
 * With no arguments, any member of the workspace may call it.
 */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

export type RouteAccess = 'public' | 'user' | 'workspace' | 'undeclared';

/** Every HTTP route of the app with how it declares access (used by the rule 3 guard test). */
export function describeRouteAccess(
  app: INestApplication,
): { controller: string; handler: string; access: RouteAccess }[] {
  const reflector = new Reflector();
  const routes: { controller: string; handler: string; access: RouteAccess }[] = [];
  for (const module of app.get(ModulesContainer).values()) {
    for (const wrapper of module.controllers.values()) {
      const type = wrapper.metatype as (new (...args: never[]) => unknown) | undefined;
      if (!type || typeof type !== 'function') continue;
      const proto = type.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = proto[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        if (Reflect.getMetadata('method', handler) === undefined) continue; // not a route
        const targets = [handler, type];
        const access: RouteAccess = reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)
          ? 'public'
          : reflector.getAllAndOverride<boolean>(IS_USER_SCOPED, targets)
            ? 'user'
            : reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS, targets)
              ? 'workspace'
              : 'undeclared';
        routes.push({ controller: type.name, handler: name, access });
      }
    }
  }
  return routes;
}
