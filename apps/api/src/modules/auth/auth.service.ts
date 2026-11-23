import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  type LoginRequest,
  type SessionResponse,
  type SignupRequest,
} from '@setubandh/shared';
import { CLOCK, type Clock } from '../../core/clock';
import { ENV, type AppEnv } from '../../core/env';
import { MailerService } from '../../core/mailer';
import { AuthRepository, type RequestMeta } from './auth.repository';
import { BREACHED_PASSWORDS, type BreachedPasswordChecker } from './breached-passwords';
import { LoginLockout } from './lockout';
import { hashPassword, verifyPassword } from './passwords';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_MS, TokenService } from './tokens';
import { workspaceDefaults, workspaceSlug } from './workspace-defaults';

export const VERIFY_LINK_TTL_MS = 24 * 60 * 60 * 1000;
/** A token rotated this recently may be presented again by a parallel tab: retry, not an attack. */
export const REFRESH_REUSE_GRACE_MS = 10_000;

export interface IssuedSession {
  session: SessionResponse;
  refreshToken: string;
}

/** Sign up, sign in, sessions and email verification (FR-AUTH-01..03, 11). */
@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly tokens: TokenService,
    private readonly lockout: LoginLockout,
    private readonly mailer: MailerService,
    @Inject(BREACHED_PASSWORDS) private readonly breached: BreachedPasswordChecker,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: AppEnv,
  ) {}

  /** Always resolves the same way whether or not the email exists (no account enumeration). */
  async signup(input: SignupRequest, meta: RequestMeta): Promise<void> {
    await this.assertPasswordAllowed(input.password);
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      await this.mailer.send({
        to: input.email,
        subject: 'You already have a Setubandh AI account',
        text: `Someone tried to sign up with this email. If it was you, sign in at ${this.env.APP_URL}/login or reset your password at ${this.env.APP_URL}/forgot-password. If not, you can ignore this email.`,
      });
      return;
    }
    const defaults = workspaceDefaults(input.timezone);
    const { user } = await this.repo.createAccount({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      workspace: {
        name: input.workspaceName,
        slug: workspaceSlug(input.workspaceName, randomBytes(4).toString('hex')),
        ...defaults,
      },
    });
    await this.repo.recordSecurityEvent('signup', user.id, meta);
    await this.sendVerification(user.id, user.email);
  }

  async login(input: LoginRequest, meta: RequestMeta): Promise<IssuedSession> {
    const lock = await this.lockout.check(input.email, meta.ip);
    if (lock.locked) {
      throw new AppError('TOO_MANY_ATTEMPTS', {
        details: { retryAfterSeconds: lock.retryAfterSeconds },
      });
    }
    const user = await this.repo.findUserByEmail(input.email);
    const ok = await verifyPassword(user?.passwordHash ?? null, input.password);
    if (!user || !ok) {
      const reachedLimit = await this.lockout.recordFailure(input.email, meta.ip);
      if (user) {
        await this.repo.recordSecurityEvent(
          reachedLimit ? 'login_locked' : 'login_failed',
          user.id,
          meta,
        );
      }
      throw new AppError('INVALID_CREDENTIALS');
    }
    await this.lockout.clearAccount(input.email);
    const now = this.clock.now();
    await this.repo.recordLogin(user.id, now);
    await this.repo.recordSecurityEvent('login_succeeded', user.id, meta);
    return this.issue(user, randomUUID(), meta);
  }

  /** Rotate the refresh token. A token used twice revokes its whole family (FR-AUTH-03). */
  async refresh(refreshToken: string | undefined, meta: RequestMeta): Promise<IssuedSession> {
    if (!refreshToken) throw new AppError('SESSION_REVOKED');
    const now = this.clock.now();
    const row = await this.repo.findRefreshToken(this.tokens.hashRefreshToken(refreshToken));
    if (!row || row.revokedAt || row.expiresAt <= now) throw new AppError('SESSION_REVOKED');
    if (row.replacedAt) {
      if (now.getTime() - row.replacedAt.getTime() <= REFRESH_REUSE_GRACE_MS) {
        // Two tabs refreshed at once; the browser already holds the newer cookie. Ask to retry.
        throw new AppError('CONFLICT', {
          message: 'Session was just refreshed. Retry the request.',
        });
      }
      await this.repo.revokeFamily(row.userId, row.familyId, now);
      await this.repo.recordSecurityEvent('refresh_token_reuse', row.userId, meta, {
        familyId: row.familyId,
      });
      throw new AppError('SESSION_REVOKED');
    }
    if (!(await this.repo.markReplaced(row.id, now))) throw new AppError('CONFLICT');
    const user = await this.repo.findUserById(row.userId);
    if (!user) throw new AppError('SESSION_REVOKED');
    return this.issue(user, row.familyId, meta);
  }

  async logout(refreshToken: string | undefined, meta: RequestMeta): Promise<void> {
    if (!refreshToken) return;
    const row = await this.repo.findRefreshToken(this.tokens.hashRefreshToken(refreshToken));
    if (!row) return;
    await this.repo.revokeFamily(row.userId, row.familyId, this.clock.now());
    await this.repo.recordSecurityEvent('logout', row.userId, meta);
  }

  async verifyEmail(token: string, meta: RequestMeta): Promise<void> {
    const now = this.clock.now();
    const userId = await this.repo.consumeEmailToken(
      this.tokens.hashEmailToken(token),
      'verify_email',
      now,
    );
    if (!userId) throw new AppError('TOKEN_INVALID');
    await this.repo.markEmailVerified(userId, now);
    await this.repo.recordSecurityEvent('email_verified', userId, meta);
  }

  /** Always "accepted": never reveals whether the email has an unverified account. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email);
    if (user && !user.emailVerifiedAt) await this.sendVerification(user.id, user.email);
  }

  async assertPasswordAllowed(password: string): Promise<void> {
    if (await this.breached.isBreached(password)) {
      throw new AppError('PASSWORD_REJECTED', {
        message: 'This password has appeared in a data breach. Choose a different one.',
        details: { fields: { password: 'This password has appeared in a data breach.' } },
      });
    }
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const token = this.tokens.opaqueToken();
    await this.repo.insertEmailToken({
      userId,
      purpose: 'verify_email',
      tokenHash: this.tokens.hashEmailToken(token),
      expiresAt: new Date(this.clock.now().getTime() + VERIFY_LINK_TTL_MS),
    });
    const link = `${this.env.APP_URL}/verify-email?token=${token}`;
    await this.mailer.send({
      to: email,
      subject: 'Verify your email for Setubandh AI',
      text: `Welcome to Setubandh AI. Verify your email within 24 hours: ${link}`,
      html: `<p>Welcome to Setubandh AI.</p><p><a href="${link}">Verify your email</a> (valid for 24 hours).</p>`,
    });
  }

  private async issue(
    user: { id: string; email: string; name: string; emailVerifiedAt: Date | null },
    familyId: string,
    meta: RequestMeta,
  ): Promise<IssuedSession> {
    const now = this.clock.now();
    const refreshToken = this.tokens.opaqueToken();
    await this.repo.insertRefreshToken({
      userId: user.id,
      familyId,
      tokenHash: this.tokens.hashRefreshToken(refreshToken),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      userAgent: meta.userAgent?.slice(0, 500),
      ip: meta.ip,
    });
    const emailVerified = user.emailVerifiedAt !== null;
    const accessToken = await this.tokens.signAccess({
      sub: user.id,
      sid: familyId,
      ev: emailVerified,
    });
    return {
      refreshToken,
      session: {
        accessToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        user: { id: user.id, email: user.email, name: user.name, emailVerified },
      },
    };
  }
}
