import {
  createParamDecorator,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@setubandh/shared';
import type { FastifyRequest } from 'fastify';
import { TokenService } from './tokens';

export interface AuthUser {
  id: string;
  sessionId: string;
  emailVerified: boolean;
}

type AuthedRequest = FastifyRequest & { user?: AuthUser };

const IS_PUBLIC = 'auth:public';
const REQUIRES_VERIFIED_EMAIL = 'auth:verified-email';

/** Route needs no access token (signup, login, health, webhooks). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Route needs a verified email, e.g. connecting a channel (FR-AUTH-01): else 403 EMAIL_NOT_VERIFIED. */
export const RequireVerifiedEmail = () => SetMetadata(REQUIRES_VERIFIED_EMAIL, true);
/** The signed-in user from the access token. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user!,
);

/** Global guard: every route needs a valid access token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const claims = token ? await this.tokens.verifyAccess(token) : null;
    if (!claims) throw new AppError('UNAUTHENTICATED');
    request.user = { id: claims.sub, sessionId: claims.sid, emailVerified: claims.ev };
    if (this.reflector.getAllAndOverride<boolean>(REQUIRES_VERIFIED_EMAIL, targets) && !claims.ev) {
      throw new AppError('EMAIL_NOT_VERIFIED');
    }
    return true;
  }
}
