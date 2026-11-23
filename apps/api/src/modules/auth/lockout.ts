import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CLOCK, type Clock } from '../../core/clock';
import { VALKEY } from '../../core/valkey';

export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
export const LOCKOUT_MAX_FAILURES = 10;

export interface LockState {
  locked: boolean;
  retryAfterSeconds: number;
}

/**
 * Failed-login counters per account and per IP (FR-AUTH-02): sliding 15-minute windows in Valkey
 * sorted sets. Accounts are keyed by a hash of the email, so unknown emails lock the same way
 * and nothing reveals whether an account exists.
 */
@Injectable()
export class LoginLockout {
  constructor(
    @Inject(VALKEY) private readonly valkey: Redis,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private keys(email: string, ip: string): [string, string] {
    const account = createHash('sha256').update(email.toLowerCase()).digest('hex');
    return [`t:auth:fail:acct:${account}`, `t:auth:fail:ip:${ip}`];
  }

  async check(email: string, ip: string): Promise<LockState> {
    const now = this.clock.now().getTime();
    let retryAfterMs = 0;
    for (const key of this.keys(email, ip)) {
      await this.valkey.zremrangebyscore(key, '-inf', String(now - LOCKOUT_WINDOW_MS));
      const failures = await this.valkey.zrange(key, '0', '-1', 'WITHSCORES');
      const count = failures.length / 2;
      if (count >= LOCKOUT_MAX_FAILURES) {
        // Unlocks when enough failures have aged out of the window.
        const index = (count - LOCKOUT_MAX_FAILURES) * 2 + 1;
        retryAfterMs = Math.max(retryAfterMs, Number(failures[index]) + LOCKOUT_WINDOW_MS - now);
      }
    }
    return {
      locked: retryAfterMs > 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  /** Record a failure; returns true when this failure just reached the limit for the account. */
  async recordFailure(email: string, ip: string): Promise<boolean> {
    const now = this.clock.now().getTime();
    const [accountKey, ipKey] = this.keys(email, ip);
    let reached = false;
    for (const key of [accountKey, ipKey]) {
      await this.valkey
        .multi()
        .zadd(key, now, `${now}:${randomUUID()}`)
        .pexpire(key, LOCKOUT_WINDOW_MS * 2)
        .exec();
      if (key === accountKey) reached = (await this.valkey.zcard(key)) === LOCKOUT_MAX_FAILURES;
    }
    return reached;
  }

  async clearAccount(email: string): Promise<void> {
    const [accountKey] = this.keys(email, '');
    await this.valkey.del(accountKey);
  }
}
