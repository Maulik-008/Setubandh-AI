import { randomUUID } from 'node:crypto';
import { adminQuery as runAdminQuery } from '@setubandh/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootAuthApi, refreshCookie, type AuthTestApp } from './support/auth-app';

// M1-09 acceptance tests against real Postgres 18 and Valkey 8.1.
const PASSWORD = 'correct horse battery staple';

describe('auth core (FR-AUTH-01..04)', () => {
  let t: AuthTestApp;

  beforeAll(async () => {
    t = await bootAuthApi();
  }, 120_000);

  afterAll(async () => {
    await t?.close();
  });

  const ip = () =>
    `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

  async function signup(email = `${randomUUID()}@example.com`, clientIp = ip()) {
    const res = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      headers: { 'x-forwarded-for': clientIp },
      payload: {
        name: 'Asha',
        email,
        password: PASSWORD,
        workspaceName: 'Asha Boutique',
        timezone: 'Asia/Kolkata',
      },
    });
    return { res, email };
  }

  async function login(email: string, password = PASSWORD, clientIp = ip()) {
    return t.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-forwarded-for': clientIp },
      payload: { email, password },
    });
  }

  async function refresh(cookie: string) {
    return t.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { sb_refresh: cookie },
    });
  }

  const adminQuery = <T extends Record<string, unknown>>(text: string, values: unknown[] = []) =>
    runAdminQuery<T>(t.db.adminUrl, text, values);

  it('signs up: creates the user, a workspace and an Owner membership, and emails a verify link', async () => {
    const { res, email } = await signup();
    expect(res.statusCode).toBe(202);
    const rows = await adminQuery<{
      role: string;
      name: string;
      timezone: string;
      currency: string;
    }>(
      `SELECT m.role, t.name, t.timezone, t.currency FROM users u
         JOIN memberships m ON m.user_id = u.id JOIN tenants t ON t.id = m.tenant_id WHERE u.email = $1`,
      [email],
    );
    expect(rows).toEqual([
      { role: 'owner', name: 'Asha Boutique', timezone: 'Asia/Kolkata', currency: 'INR' },
    ]);
    expect(t.outbox.tokenFor(email)).toBeTruthy();
  });

  it('answers a signup with an existing email the same way, and tells the owner instead', async () => {
    const { email } = await signup();
    const again = await signup(email);
    expect(again.res.statusCode).toBe(202);
    expect(t.outbox.lastTo(email)?.subject).toMatch(/already have a Setubandh AI account/i);
  });

  it('gives the same generic error for an unknown email and a wrong password', async () => {
    const { email } = await signup();
    const wrong = await login(email, 'not the password at all');
    const unknown = await login(`${randomUUID()}@example.com`);
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json().error.message).toBe('Email or password is incorrect.');
    expect(unknown.json().error.message).toBe(wrong.json().error.message);
  });

  it('logs in with a short-lived access token and an httpOnly, SameSite=Lax refresh cookie', async () => {
    const { email } = await signup();
    const res = await login(email);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      accessToken: expect.any(String),
      expiresIn: 900,
      user: { email },
    });
    const header = String(res.headers['set-cookie']);
    expect(header).toMatch(/sb_refresh=/);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Path=\/v1\/auth/);
  });

  it('rotates the refresh token on every use', async () => {
    const { email } = await signup();
    const first = refreshCookie((await login(email)).headers['set-cookie']);
    const res = await refresh(first);
    expect(res.statusCode).toBe(200);
    expect(refreshCookie(res.headers['set-cookie'])).not.toBe(first);
  });

  it('AC: a reused refresh token revokes the whole family and writes a security audit entry', async () => {
    const { email } = await signup();
    const first = refreshCookie((await login(email)).headers['set-cookie']);
    const second = refreshCookie((await refresh(first)).headers['set-cookie']);
    t.clock.advance(60_000); // past the 10 s concurrent-refresh grace window

    const replay = await refresh(first);
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe('SESSION_REVOKED');
    // The legitimate newer token of the same family is revoked too.
    expect((await refresh(second)).json().error.code).toBe('SESSION_REVOKED');

    const events = await adminQuery<{ type: string }>(
      `SELECT e.type FROM security_events e JOIN users u ON u.id = e.user_id WHERE u.email = $1`,
      [email],
    );
    expect(events.map((e) => e.type)).toContain('refresh_token_reuse');
  });

  it('AC: the 11th failed login in 15 minutes is rejected for that account and for that IP', async () => {
    const { email } = await signup();
    const attackerIp = ip();
    for (let i = 0; i < 10; i++) {
      expect((await login(email, `wrong-password-${i}`, attackerIp)).statusCode).toBe(401);
    }
    // 11th attempt, even with the right password: refused for the account (from any IP)…
    const locked = await login(email, PASSWORD, attackerIp);
    expect(locked.statusCode).toBe(429);
    expect(locked.json().error.code).toBe('TOO_MANY_ATTEMPTS');
    expect(locked.headers['retry-after']).toBeDefined();
    expect((await login(email, PASSWORD, ip())).statusCode).toBe(429);
    // …and for the IP (another account from the same IP).
    const other = await signup();
    expect((await login(other.email, PASSWORD, attackerIp)).statusCode).toBe(429);

    // After the 15-minute window both locks lift.
    t.clock.advance(15 * 60_000 + 1_000);
    expect((await login(email, PASSWORD, attackerIp)).statusCode).toBe(200);
  });

  it('AC: an unverified user gets EMAIL_NOT_VERIFIED for actions that need a verified email', async () => {
    const { email } = await signup();
    const token = (await login(email)).json<{ accessToken: string }>().accessToken;
    const blocked = await t.app.inject({
      method: 'GET',
      url: '/v1/test/verified-only',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().error.code).toBe('EMAIL_NOT_VERIFIED');

    const verify = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/verify-email',
      payload: { token: t.outbox.tokenFor(email) },
    });
    expect(verify.statusCode).toBe(200);
    const fresh = (await login(email)).json<{ accessToken: string }>().accessToken;
    const allowed = await t.app.inject({
      method: 'GET',
      url: '/v1/test/verified-only',
      headers: { authorization: `Bearer ${fresh}` },
    });
    expect(allowed.statusCode).toBe(200);
  });

  it('rejects requests without a valid access token', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/v1/test/verified-only' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHENTICATED');
    const forged = await t.app.inject({
      method: 'GET',
      url: '/v1/test/verified-only',
      headers: { authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.' },
    });
    expect(forged.statusCode).toBe(401);
  });

  it('logs out: the refresh token stops working', async () => {
    const { email } = await signup();
    const cookie = refreshCookie((await login(email)).headers['set-cookie']);
    const out = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      cookies: { sb_refresh: cookie },
    });
    expect(out.statusCode).toBe(204);
    expect((await refresh(cookie)).json().error.code).toBe('SESSION_REVOKED');
  });
});
