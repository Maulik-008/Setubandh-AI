import { RequestMethod, SetMetadata, type INestApplication } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
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

export interface RouteInfo {
  controller: string;
  handler: string;
  /** HTTP method, upper case (GET, POST, ...). */
  method: string;
  /** Full path with the `/v1` prefix and `:params`, e.g. `/v1/members/:id`. */
  path: string;
  access: RouteAccess;
}

const join = (...parts: (string | undefined)[]) =>
  '/' +
  parts
    .flatMap((p) => (p ?? '').split('/'))
    .filter(Boolean)
    .join('/');

/**
 * Every HTTP route of the app with how it declares access. Used by the rule 3 guard test and the
 * tenant isolation suite, so new routes are covered without anyone listing them.
 */
export function describeRouteAccess(app: INestApplication, prefix = 'v1'): RouteInfo[] {
  const reflector = new Reflector();
  const routes: RouteInfo[] = [];
  for (const module of app.get(ModulesContainer).values()) {
    for (const wrapper of module.controllers.values()) {
      const type = wrapper.metatype as (new (...args: never[]) => unknown) | undefined;
      if (!type || typeof type !== 'function') continue;
      const proto = type.prototype as Record<string, unknown>;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = proto[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue; // not a route
        const targets = [handler, type];
        const access: RouteAccess = reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)
          ? 'public'
          : reflector.getAllAndOverride<boolean>(IS_USER_SCOPED, targets)
            ? 'user'
            : reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS, targets)
              ? 'workspace'
              : 'undeclared';
        const method =
          RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number] ?? 'UNKNOWN';
        const base = Reflect.getMetadata(PATH_METADATA, type) as string | undefined;
        const sub = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
        // Health stays outside the version prefix (M1-03).
        const path = base === 'health' ? join(base, sub) : join(prefix, base, sub);
        routes.push({ controller: type.name, handler: name, method, path, access });
      }
    }
  }
  return routes;
}
