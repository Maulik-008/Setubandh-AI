// Public entry of the auth module.
export { AuthModule } from './auth.module';
export { AuthService, type IssuedSession } from './auth.service';
export { hashPassword } from './passwords';
export { withSessionCookie } from './session-cookie';
export { AuthRateLimitGuard } from './rate-limit.guard';
export type { RequestMeta } from './auth.repository';
export { CurrentUser, RequireVerifiedEmail, type AuthUser } from './auth.guard';
export { Public } from '../../core/access';
export {
  BREACHED_PASSWORDS,
  HibpBreachedPasswords,
  type BreachedPasswordChecker,
} from './breached-passwords';
export { workspaceDefaults, workspaceSlug } from './workspace-defaults';
