import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootAuthApi, refreshCookie, type AuthTestApp } from './support/auth-app';

const PASSWORD = 'correct horse battery staple';
const NEW_PASSWORD = 'a brand new long passphrase';

describe('password reset, breached passwords, /me, auth rate limit (FR-AUTH-04, 11)', () => {
  let t: AuthTestApp;
  beforeAll(async () => {
    t = await bootAuthApi();
  }, 120_000);
  afterAll(async () => {
    await t?.close();
  });

  const ip = () => `172.16.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const post = (url: string, payload?: object, extra: Record<string, unknown> = {}) =>
    t.app.inject({ method: 'POST', url, payload, headers: { 'x-forwarded-for': ip() }, ...extra });

  async function account() {
    const email = `${randomUUID()}@example.com`;
    await post('/v1/auth/signup', {
      name: 'Ravi',
      email,
      password: PASSWORD,
      workspaceName: 'Ravi Store',
    });
    return email;
  }
  const login = (email: string, password = PASSWORD) => post('/v1/auth/login', { email, password });

  it('AC: reset revokes all sessions', async () => {
    const email = await account();
    const sessionA = refreshCookie((await login(email)).headers['set-cookie']);
    const sessionB = refreshCookie((await login(email)).headers['set-cookie']);

    expect((await post('/v1/auth/forgot-password', { email })).statusCode).toBe(202);
    const reset = await post('/v1/auth/reset-password', {
      token: t.outbox.tokenFor(email),
      password: NEW_PASSWORD,
    });
    expect(reset.statusCode).toBe(200);

    for (const cookie of [sessionA, sessionB]) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/v1/auth/refresh',
        cookies: { sb_refresh: cookie },
      });
      expect(res.json().error.code).toBe('SESSION_REVOKED');
    }
    expect((await login(email)).statusCode).toBe(401);
    expect((await login(email, NEW_PASSWORD)).statusCode).toBe(200);
  });

  it('reset links work once and expire after 1 hour', async () => {
    const email = await account();
    await post('/v1/auth/forgot-password', { email });
    const token = t.outbox.tokenFor(email);
    expect(
      (await post('/v1/auth/reset-password', { token, password: NEW_PASSWORD })).statusCode,
    ).toBe(200);
    const again = await post('/v1/auth/reset-password', {
      token,
      password: 'yet another passphrase',
    });
    expect(again.json().error.code).toBe('TOKEN_INVALID');

    await post('/v1/auth/forgot-password', { email });
    const late = t.outbox.tokenFor(email);
    t.clock.advance(61 * 60_000);
    expect(
      (
        await post('/v1/auth/reset-password', { token: late, password: 'later passphrase 123' })
      ).json().error.code,
    ).toBe('TOKEN_INVALID');
  });

  it('answers forgot-password the same for unknown emails and sends nothing', async () => {
    const unknown = `${randomUUID()}@example.com`;
    expect((await post('/v1/auth/forgot-password', { email: unknown })).statusCode).toBe(202);
    expect(t.outbox.lastTo(unknown)).toBeUndefined();
  });

  it('rejects a breached password at signup and at reset (422 PASSWORD_REJECTED)', async () => {
    t.breached.add('this one is in a breach list');
    const res = await post('/v1/auth/signup', {
      name: 'X',
      email: `${randomUUID()}@example.com`,
      password: 'this one is in a breach list',
      workspaceName: 'X',
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('PASSWORD_REJECTED');
  });

  it('rejects passwords shorter than 10 characters with a field error', async () => {
    const res = await post('/v1/auth/signup', {
      name: 'X',
      email: `${randomUUID()}@example.com`,
      password: 'short',
      workspaceName: 'X',
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.details.fields.password).toMatch(/10 characters/);
  });

  it('reads and updates the signed-in user with GET/PATCH /v1/me', async () => {
    const email = await account();
    const token = (await login(email)).json<{ accessToken: string }>().accessToken;
    const auth = { authorization: `Bearer ${token}` };
    const me = await t.app.inject({ method: 'GET', url: '/v1/me', headers: auth });
    expect(me.json()).toMatchObject({
      email,
      name: 'Ravi',
      emailVerified: false,
      locale: 'en',
      avatarUrl: null,
    });
    const patched = await t.app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: auth,
      payload: { name: 'Ravi K', locale: 'hi' },
    });
    expect(patched.json()).toMatchObject({ name: 'Ravi K', locale: 'hi' });
    expect((await t.app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401);
  });

  it('rate-limits auth endpoints per IP (requirements §14.3)', async () => {
    const sameIp = ip();
    const codes: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        headers: { 'x-forwarded-for': sameIp },
        payload: { email: `${randomUUID()}@example.com` },
      });
      codes.push(res.statusCode);
    }
    expect(codes.slice(0, 30).every((c) => c === 202)).toBe(true);
    expect(codes[30]).toBe(429);
  });
});
