import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { migrate } from '@setubandh/db';
import {
  createTestDatabase,
  spawnApp,
  testEnv,
  type SpawnedApp,
  type TestDatabase,
} from '@setubandh/testing';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { BREACHED_PASSWORDS } from '../src/modules/auth';
import { bootApi } from './support/app';

/**
 * M1-14 AC "All email links work end to end locally": the real API queues each email, the real
 * worker (its own process) sends it over SMTP to Mailpit, and the test follows the link it reads
 * there: the path matches the web route and the API accepts the token.
 */
const PASSWORD = 'correct horse battery staple';
const APP_URL = 'http://localhost:5173';

interface MailpitMessage {
  ID: string;
  Subject: string;
  Text: string;
  HTML: string;
}

describe('email links end to end (API → queue → worker → SMTP → Mailpit)', () => {
  let app: NestFastifyApplication;
  let worker: SpawnedApp;
  let db: TestDatabase;
  const mailpit = inject('mailpit');
  // Own Valkey database: other integration files share the container.
  const redisUrl = `${inject('valkeyUrl')}/7`;

  const ip = () => `10.70.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const post = (url: string, payload?: object, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url, payload, headers: { 'x-forwarded-for': ip(), ...headers } });

  /** The newest email to `to`, waiting for the worker to deliver it. */
  async function mailTo(to: string, subjectIncludes: string): Promise<MailpitMessage> {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const search = await fetch(
        `${mailpit.apiUrl}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
      );
      const { messages } = (await search.json()) as { messages: { ID: string; Subject: string }[] };
      const hit = messages.find((m) => m.Subject.includes(subjectIncludes));
      if (hit)
        return (await (
          await fetch(`${mailpit.apiUrl}/api/v1/message/${hit.ID}`)
        ).json()) as MailpitMessage;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`No email "${subjectIncludes}" reached ${to}`);
  }

  /** The link in the email: same in the text and HTML parts, pointing at the web route. */
  function linkIn(message: MailpitMessage, route: string): { url: URL; token: string } {
    const match = new RegExp(
      `${APP_URL.replace(/[.:/]/g, '\\$&')}${route}\\?token=([A-Za-z0-9_-]+)`,
    ).exec(message.Text);
    expect(match, `link to ${route} in the text part`).not.toBeNull();
    const url = new URL(match![0]);
    expect(message.HTML).toContain(`href="${url.toString()}"`);
    return { url, token: match![1]! };
  }

  beforeAll(async () => {
    db = await createTestDatabase(inject('postgresUrl'));
    await migrate({ adminUrl: db.adminUrl, appUrl: db.appUrl });
    const env = {
      DATABASE_URL: db.appUrl,
      REDIS_URL: redisUrl,
      APP_URL,
      SMTP_HOST: mailpit.smtpHost,
      SMTP_PORT: String(mailpit.smtpPort),
      SMTP_USER: '',
      SMTP_PASS: '',
    };
    worker = spawnApp({
      entry: fileURLToPath(new URL('../../worker/src/main.ts', import.meta.url)),
      cwd: fileURLToPath(new URL('../../worker', import.meta.url)),
      tsconfig: fileURLToPath(new URL('../../worker/tsconfig.json', import.meta.url)),
      swcRegister: import.meta.resolve('@swc-node/register/esm-register'),
      env: { ...testEnv(), ...env },
    });
    await worker.waitForOutput('worker started', 30_000);
    // The real mail transport (the email queue), with HIBP replaced: no network in tests.
    app = await bootApi(env, (b) =>
      b.overrideProvider(BREACHED_PASSWORDS).useValue({ isBreached: () => Promise.resolve(false) }),
    );
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await worker?.stop();
    await db?.drop();
  });

  it('AC: signup → verify link confirms the email', async () => {
    const email = `${randomUUID()}@example.com`;
    expect(
      (
        await post('/v1/auth/signup', {
          name: 'Asha',
          email,
          password: PASSWORD,
          workspaceName: 'Kesari',
        })
      ).statusCode,
    ).toBe(202);
    const message = await mailTo(email, 'Confirm your email');
    const { url, token } = linkIn(message, '/verify');
    expect(url.pathname).toBe('/verify');
    expect((await post('/v1/auth/verify-email', { token })).statusCode).toBe(200);
    const login = await post('/v1/auth/login', { email, password: PASSWORD });
    expect(login.json<{ user: { emailVerified: boolean } }>().user.emailVerified).toBe(true);
  });

  it('AC: forgot password → reset link sets the new password', async () => {
    const email = `${randomUUID()}@example.com`;
    await post('/v1/auth/signup', {
      name: 'Ravi',
      email,
      password: PASSWORD,
      workspaceName: 'Ravi Co',
    });
    await mailTo(email, 'Confirm your email');
    expect((await post('/v1/auth/forgot-password', { email })).statusCode).toBe(202);
    const { url, token } = linkIn(await mailTo(email, 'Reset your'), '/reset');
    expect(url.pathname).toBe('/reset');
    const newPassword = 'a brand new long password';
    expect(
      (await post('/v1/auth/reset-password', { token, password: newPassword })).statusCode,
    ).toBe(200);
    expect((await post('/v1/auth/login', { email, password: newPassword })).statusCode).toBe(200);
  });

  it('AC: invitation → invite link creates the account and joins the workspace', async () => {
    const owner = `${randomUUID()}@example.com`;
    await post('/v1/auth/signup', {
      name: 'Owner',
      email: owner,
      password: PASSWORD,
      workspaceName: 'Invite Co',
    });
    const token = (await post('/v1/auth/login', { email: owner, password: PASSWORD })).json<{
      accessToken: string;
    }>().accessToken;
    const auth = { authorization: `Bearer ${token}` };
    const ws = (await app.inject({ method: 'GET', url: '/v1/workspaces', headers: auth })).json<{
      workspaces: { id: string }[];
    }>().workspaces[0]!.id;
    const invitee = `${randomUUID()}@example.com`;
    expect(
      (
        await post(
          '/v1/invitations',
          { email: invitee, role: 'agent' },
          { ...auth, 'x-workspace-id': ws },
        )
      ).statusCode,
    ).toBe(201);
    const message = await mailTo(invitee, 'invited you to Invite Co');
    const link = linkIn(message, '/invite');
    expect(link.url.pathname).toBe('/invite');
    const accepted = await post('/v1/auth/accept-invite', {
      token: link.token,
      name: 'New Agent',
      password: PASSWORD,
    });
    expect(accepted.statusCode).toBe(200);
    const agentAuth = {
      authorization: `Bearer ${accepted.json<{ accessToken: string }>().accessToken}`,
    };
    const list = (
      await app.inject({ method: 'GET', url: '/v1/workspaces', headers: agentAuth })
    ).json<{ workspaces: { id: string; role: string }[] }>();
    expect(list.workspaces).toEqual([expect.objectContaining({ id: ws, role: 'agent' })]);
  });

  it('a second signup with the same email sends the "already have an account" notice with a sign-in link', async () => {
    const email = `${randomUUID()}@example.com`;
    await post('/v1/auth/signup', {
      name: 'Dup',
      email,
      password: PASSWORD,
      workspaceName: 'Dup Co',
    });
    await post('/v1/auth/signup', {
      name: 'Dup',
      email,
      password: PASSWORD,
      workspaceName: 'Dup Co',
    });
    const message = await mailTo(email, 'You already have');
    expect(message.Text).toContain(`${APP_URL}/login`);
    expect(message.HTML).toContain(`href="${APP_URL}/login"`);
  });

  it('the worker logs the template, never the recipient or subject (rule 7)', () => {
    const output = worker.stdout() + worker.stderr();
    expect(output).toContain('"template":"verify_email"');
    expect(output).not.toMatch(/@example\.com/);
    expect(output).not.toContain('Confirm your email');
  });
});
