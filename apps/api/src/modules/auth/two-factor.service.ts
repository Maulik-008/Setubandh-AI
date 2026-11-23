import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, or, recoveryCodes, users, type Database } from '@setubandh/db';
import { AppError, type TwoFactorSetupResponse } from '@setubandh/shared';
import { Secret, TOTP } from 'otpauth';
import { toString as qrToSvg } from 'qrcode';
import { CLOCK, type Clock } from '../../core/clock';
import { createSecretBox, type SecretBox } from '../../core/crypto';
import { DATABASE } from '../../core/database';
import { ENV, type AppEnv } from '../../core/env';
import { AuthRepository, type RequestMeta } from './auth.repository';
import { verifyPassword } from './passwords';

const ISSUER = 'Setubandh AI';
const PERIOD = 30;
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)

const hashCode = (code: string) =>
  createHash('sha256')
    .update(code.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .digest('hex');

function newRecoveryCode(): string {
  const bytes = randomBytes(10);
  const chars = [...bytes].map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

/** TOTP two-step sign-in (FR-AUTH-05): RFC 6238, 6 digits, 30 s, ±1 step, no code reuse. */
@Injectable()
export class TwoFactorService {
  private readonly box: SecretBox;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) env: AppEnv,
    private readonly repo: AuthRepository,
  ) {
    this.box = createSecretBox(env.ENCRYPTION_KEY);
  }

  private totp(secretBase32: string, label: string): TOTP {
    return new TOTP({
      issuer: ISSUER,
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: PERIOD,
      secret: Secret.fromBase32(secretBase32),
    });
  }

  /** New pending secret (not enabled until a code is confirmed). */
  async setup(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new AppError('UNAUTHENTICATED');
    if (user.totpEnabled)
      throw new AppError('CONFLICT', { message: 'Two-step sign-in is already on.' });
    const secret = new Secret({ size: 20 }).base32;
    await this.db.platform
      .update(users)
      .set({ totpSecretEnc: this.box.seal(secret), totpLastStep: null })
      .where(eq(users.id, userId));
    const otpauthUrl = this.totp(secret, user.email).toString();
    return { secret, otpauthUrl, qrSvg: await qrToSvg(otpauthUrl, { type: 'svg', margin: 1 }) };
  }

  /** Confirm the app works, switch 2FA on and return 10 fresh recovery codes (shown once). */
  async enable(userId: string, code: string, meta: RequestMeta): Promise<string[]> {
    const user = await this.repo.findUserById(userId);
    if (!user?.totpSecretEnc || user.totpEnabled)
      throw new AppError('CONFLICT', { message: 'Start setup first.' });
    if (!(await this.acceptCode(userId, user.totpSecretEnc, user.email, code))) {
      throw new AppError('VALIDATION_FAILED', {
        details: { fields: { code: 'That code is not right. Try the current one.' } },
      });
    }
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
    await this.db.platform.transaction(async (tx) => {
      await tx.update(users).set({ totpEnabled: true }).where(eq(users.id, userId));
      await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
      await tx.insert(recoveryCodes).values(codes.map((c) => ({ userId, codeHash: hashCode(c) })));
    });
    await this.repo.recordSecurityEvent('two_factor_enabled', userId, meta);
    return codes;
  }

  async disable(userId: string, password: string, meta: RequestMeta): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user || !(await verifyPassword(user.passwordHash, password)))
      throw new AppError('INVALID_CREDENTIALS');
    await this.db.platform.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ totpEnabled: false, totpSecretEnc: null, totpLastStep: null })
        .where(eq(users.id, userId));
      await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
    });
    await this.repo.recordSecurityEvent('two_factor_disabled', userId, meta);
  }

  /** Second step of login: a fresh TOTP code or an unused recovery code. */
  async verifyLogin(
    user: { id: string; email: string; totpSecretEnc: string | null },
    proof: { code: string } | { recoveryCode: string },
    meta: RequestMeta,
  ): Promise<boolean> {
    if ('code' in proof) {
      return user.totpSecretEnc
        ? this.acceptCode(user.id, user.totpSecretEnc, user.email, proof.code)
        : false;
    }
    const used = await this.db.platform
      .update(recoveryCodes)
      .set({ usedAt: this.clock.now() })
      .where(
        and(
          eq(recoveryCodes.userId, user.id),
          eq(recoveryCodes.codeHash, hashCode(proof.recoveryCode)),
          isNull(recoveryCodes.usedAt),
        ),
      )
      .returning({ id: recoveryCodes.id });
    if (used.length === 0) return false;
    await this.repo.recordSecurityEvent('recovery_code_used', user.id, meta);
    return true;
  }

  /** Valid within ±1 step and newer than the last accepted step (atomic, so no replay). */
  private async acceptCode(
    userId: string,
    sealed: string,
    email: string,
    code: string,
  ): Promise<boolean> {
    const totp = this.totp(this.box.open(sealed), email);
    const timestamp = this.clock.now().getTime();
    const delta = totp.validate({ token: code, timestamp, window: 1 });
    if (delta === null) return false;
    const step = Math.floor(timestamp / 1000 / PERIOD) + delta;
    const updated = await this.db.platform
      .update(users)
      .set({ totpLastStep: step })
      .where(
        and(eq(users.id, userId), or(isNull(users.totpLastStep), lt(users.totpLastStep, step))),
      )
      .returning({ id: users.id });
    return updated.length === 1;
  }
}
