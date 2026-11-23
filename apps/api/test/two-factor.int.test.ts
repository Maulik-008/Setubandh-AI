import { randomUUID } from 'node:crypto';
import { adminQuery } from '@setubandh/testing';
import { TOTP } from 'otpauth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootAuthApi, type AuthTestApp } from './support/auth-app';

const PASSWORD = 'correct horse battery staple';

describe('two-step sign-in (FR-AUTH-05)', () => {
  let t: AuthTestApp;
  beforeAll(async () => {
    t = await bootAuthApi();
  }, 120_000);
  afterAll(async () => {
    await t?.close();
  });

  const ip = () => `192.168.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const post = (url: string, payload?: object, headers: Record<string, string> = {}) =>
    t.app.inject({
      method: 'POST',
      url,
      payload,
      headers: { 'x-forwarded-for': ip(), ...headers },
    });

  /** A user with 2FA enabled; returns their TOTP generator, recovery codes and email. */
  async function userWith2fa() {
    const email = `${randomUUID()}@example.com`;
    await post('/v1/auth/signup', {
      name: 'Meera',
      email,
      password: PASSWORD,
      workspaceName: 'Meera Studio',
    });
    const token = (await post('/v1/auth/login', { email, password: PASSWORD })).json<{
      accessToken: string;
    }>().accessToken;
    const auth = { authorization: `Bearer ${token}` };
    const setup = await post('/v1/me/2fa/setup', undefined, auth);
    expect(setup.statusCode).toBe(200);
    const { secret, otpauthUrl, qrSvg } = setup.json<{
      secret: string;
      otpauthUrl: string;
      qrSvg: string;
    }>();
    expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(qrSvg).toMatch(/^<svg/);
    const totp = new TOTP({ secret, digits: 6, period: 30, algorithm: 'SHA1' });
    const enable = await post(
      '/v1/me/2fa/enable',
      { code: totp.generate({ timestamp: t.clock.now().getTime() }) },
      auth,
    );
    expect(enable.statusCode).toBe(200);
    const { recoveryCodes } = enable.json<{ recoveryCodes: string[] }>();
    return { email, totp, recoveryCodes, auth };
  }

  const code = (totp: TOTP) => totp.generate({ timestamp: t.clock.now().getTime() });

  it('AC: login asks for the code when enabled; a recovery code works once', async () => {
    const { email, totp, recoveryCodes } = await userWith2fa();
    expect(recoveryCodes).toHaveLength(10);

    const first = await post('/v1/auth/login', { email, password: PASSWORD });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ mfaRequired: true, challengeToken: expect.any(String) });
    expect(first.headers['set-cookie']).toBeUndefined();

    t.clock.advance(31_000); // a new 30 s step, so the code differs from the one used to enable
    const withCode = await post('/v1/auth/login/2fa', {
      challengeToken: first.json().challengeToken,
      code: code(totp),
    });
    expect(withCode.statusCode).toBe(200);
    expect(withCode.json().accessToken).toEqual(expect.any(String));
    expect(String(withCode.headers['set-cookie'])).toMatch(/sb_refresh=/);

    const recovery = recoveryCodes[0]!;
    const second = (await post('/v1/auth/login', { email, password: PASSWORD })).json<{
      challengeToken: string;
    }>();
    expect(
      (
        await post('/v1/auth/login/2fa', {
          challengeToken: second.challengeToken,
          recoveryCode: recovery,
        })
      ).statusCode,
    ).toBe(200);

    const third = (await post('/v1/auth/login', { email, password: PASSWORD })).json<{
      challengeToken: string;
    }>();
    const reused = await post('/v1/auth/login/2fa', {
      challengeToken: third.challengeToken,
      recoveryCode: recovery,
    });
    expect(reused.statusCode).toBe(401);
    expect(reused.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refuses a TOTP code that was already used (replay)', async () => {
    const { email, totp } = await userWith2fa();
    t.clock.advance(31_000);
    const used = code(totp);
    const a = (await post('/v1/auth/login', { email, password: PASSWORD })).json<{
      challengeToken: string;
    }>();
    expect(
      (await post('/v1/auth/login/2fa', { challengeToken: a.challengeToken, code: used }))
        .statusCode,
    ).toBe(200);
    const b = (await post('/v1/auth/login', { email, password: PASSWORD })).json<{
      challengeToken: string;
    }>();
    expect(
      (await post('/v1/auth/login/2fa', { challengeToken: b.challengeToken, code: used }))
        .statusCode,
    ).toBe(401);
  });

  it('rejects an expired or reused challenge', async () => {
    const { email, totp } = await userWith2fa();
    const challenge = (await post('/v1/auth/login', { email, password: PASSWORD })).json<{
      challengeToken: string;
    }>().challengeToken;
    t.clock.advance(6 * 60_000);
    const expired = await post('/v1/auth/login/2fa', {
      challengeToken: challenge,
      code: code(totp),
    });
    expect(expired.json().error.code).toBe('SESSION_REVOKED');
  });

  it('counts wrong codes toward the account lockout', async () => {
    const { email } = await userWith2fa();
    const sameIp = ip();
    for (let i = 0; i < 10; i++) {
      const c = (
        await post('/v1/auth/login', { email, password: PASSWORD }, { 'x-forwarded-for': sameIp })
      ).json<{ challengeToken: string }>();
      await post(
        '/v1/auth/login/2fa',
        { challengeToken: c.challengeToken, code: '000000' },
        { 'x-forwarded-for': sameIp },
      );
    }
    const locked = await post('/v1/auth/login', { email, password: PASSWORD });
    expect(locked.statusCode).toBe(429);
  });

  it('stores the TOTP secret encrypted, not in the clear', async () => {
    const { email, totp } = await userWith2fa();
    const [row] = await adminQuery<{ totp_secret_enc: string }>(
      t.db.adminUrl,
      'SELECT totp_secret_enc FROM users WHERE email = $1',
      [email],
    );
    expect(row?.totp_secret_enc).toBeTruthy();
    expect(row?.totp_secret_enc).not.toContain(totp.secret.base32);
  });

  it('disables 2FA only with the right password', async () => {
    const { email, auth } = await userWith2fa();
    expect(
      (await post('/v1/me/2fa/disable', { password: 'wrong password here' }, auth)).statusCode,
    ).toBe(401);
    expect((await post('/v1/me/2fa/disable', { password: PASSWORD }, auth)).statusCode).toBe(204);
    const login = await post('/v1/auth/login', { email, password: PASSWORD });
    expect(login.json().accessToken).toEqual(expect.any(String));
  });

  it('refuses to enable with a wrong code', async () => {
    const email = `${randomUUID()}@example.com`;
    await post('/v1/auth/signup', { name: 'X', email, password: PASSWORD, workspaceName: 'X' });
    const token = (await post('/v1/auth/login', { email, password: PASSWORD })).json<{
      accessToken: string;
    }>().accessToken;
    const auth = { authorization: `Bearer ${token}` };
    await post('/v1/me/2fa/setup', undefined, auth);
    const res = await post('/v1/me/2fa/enable', { code: '123456' }, auth);
    expect(res.statusCode).toBe(422);
  });
});
