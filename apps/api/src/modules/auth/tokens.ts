import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { CLOCK, type Clock } from '../../core/clock';
import { ENV, type AppEnv } from '../../core/env';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ISSUER = 'setubandh';
const AUDIENCE = 'setubandh-api';

export interface AccessClaims {
  /** user id */
  sub: string;
  /** session family id */
  sid: string;
  /** email verified */
  ev: boolean;
}

/** Access tokens (JWT HS256, 15 min, FR-AUTH-03) and hashing of opaque tokens. */
@Injectable()
export class TokenService {
  private readonly accessKey: Uint8Array;

  constructor(
    @Inject(ENV) private readonly env: AppEnv,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  signAccess(claims: AccessClaims): Promise<string> {
    const now = Math.floor(this.clock.now().getTime() / 1000);
    return new SignJWT({ sid: claims.sid, ev: claims.ev })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(claims.sub)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
      .sign(this.accessKey);
  }

  /** Returns the claims, or null for any invalid, expired or forged token. */
  async verifyAccess(token: string): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.accessKey, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
        currentDate: this.clock.now(),
      });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
      return { sub: payload.sub, sid: payload.sid, ev: payload.ev === true };
    } catch {
      return null;
    }
  }

  /** 32 random bytes, URL-safe. Used for refresh tokens and email links. */
  opaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /** Refresh tokens are stored as HMAC-SHA256 keyed with JWT_REFRESH_SECRET (a DB leak alone is useless). */
  hashRefreshToken(token: string): string {
    return createHmac('sha256', this.env.JWT_REFRESH_SECRET).update(token).digest('hex');
  }

  /** Email link tokens are stored as SHA-256. */
  hashEmailToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
