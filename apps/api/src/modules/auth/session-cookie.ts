import type { SessionResponse } from '@setubandh/shared';
import type { FastifyReply } from 'fastify';
import type { AppEnv } from '../../core/env';
import type { IssuedSession } from './auth.service';
import { REFRESH_TOKEN_TTL_MS } from './tokens';

export const REFRESH_COOKIE = 'sb_refresh';

/** Put the refresh token in its httpOnly cookie and return the body for the client (FR-AUTH-02). */
export function withSessionCookie(
  reply: FastifyReply,
  issued: IssuedSession,
  env: Pick<AppEnv, 'NODE_ENV'>,
): SessionResponse {
  void reply.setCookie(REFRESH_COOKIE, issued.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/v1/auth',
    maxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
  });
  return issued.session;
}
