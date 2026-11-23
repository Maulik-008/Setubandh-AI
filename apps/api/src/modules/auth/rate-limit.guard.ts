import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { AppError } from '@setubandh/shared';
import type { FastifyRequest } from 'fastify';
import type { Redis } from 'ioredis';
import { CLOCK, type Clock } from '../../core/clock';
import { VALKEY } from '../../core/valkey';

export const AUTH_REQUESTS_PER_MINUTE = 30;

/** Per-IP limit on /v1/auth/* (requirements §14.3): fixed one-minute windows in Valkey. */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    @Inject(VALKEY) private readonly valkey: Redis,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const nowMs = this.clock.now().getTime();
    const window = Math.floor(nowMs / 60_000);
    const key = `t:auth:rl:${request.ip}:${window}`;
    const [[, count]] = (await this.valkey.multi().incr(key).expire(key, 120).exec()) as [
      [null, number],
    ];
    if (count > AUTH_REQUESTS_PER_MINUTE) {
      const retryAfterSeconds = Math.max(1, Math.ceil(((window + 1) * 60_000 - nowMs) / 1000));
      throw new AppError('RATE_LIMITED', { details: { retryAfterSeconds } });
    }
    return true;
  }
}
