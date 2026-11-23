import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { migrate } from '@setubandh/db';
import { createTestDatabase, type TestDatabase } from '@setubandh/testing';
import { inject } from 'vitest';
import { CLOCK, type Clock } from '../../src/core/clock';
import { MAIL_TRANSPORT, type MailMessage, type MailTransport } from '../../src/core/mailer';
import { BREACHED_PASSWORDS, type BreachedPasswordChecker } from '../../src/modules/auth';
import { bootApi } from './app';

/** A clock tests can move forward (lockout windows, link expiry). */
export class FakeClock implements Clock {
  private offsetMs = 0;
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }
  advance(ms: number): void {
    this.offsetMs += ms;
  }
}

/** Captures emails instead of sending them; tests read links from here. */
export class Outbox implements MailTransport {
  readonly messages: MailMessage[] = [];
  send(message: MailMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }
  lastTo(address: string): MailMessage | undefined {
    return this.messages.filter((m) => m.to === address).at(-1);
  }
  /** The token from the last link sent to `address` (…?token=xyz). */
  tokenFor(address: string): string {
    const text = this.lastTo(address)?.text ?? '';
    const match = /[?&]token=([A-Za-z0-9_-]+)/.exec(text);
    if (!match?.[1]) throw new Error(`No link with a token was sent to ${address}`);
    return match[1];
  }
}

export interface AuthTestApp {
  app: NestFastifyApplication;
  db: TestDatabase;
  clock: FakeClock;
  outbox: Outbox;
  breached: Set<string>;
  close: () => Promise<void>;
}

/** Real API + real Postgres (fresh migrated database) + real Valkey, with fake mail and clock. */
export async function bootAuthApi(): Promise<AuthTestApp> {
  const db = await createTestDatabase(inject('postgresUrl'));
  await migrate({ adminUrl: db.adminUrl, appUrl: db.appUrl });
  const clock = new FakeClock();
  const outbox = new Outbox();
  const breached = new Set<string>();
  const checker: BreachedPasswordChecker = {
    isBreached: (password) => Promise.resolve(breached.has(password)),
  };
  const app = await bootApi({ DATABASE_URL: db.appUrl, REDIS_URL: inject('valkeyUrl') }, (b) =>
    b
      .overrideProvider(CLOCK)
      .useValue(clock)
      .overrideProvider(MAIL_TRANSPORT)
      .useValue(outbox)
      .overrideProvider(BREACHED_PASSWORDS)
      .useValue(checker),
  );
  return {
    app,
    db,
    clock,
    outbox,
    breached,
    close: async () => {
      await app.close();
      await db.drop();
    },
  };
}

/** Pull the refresh cookie value out of a Set-Cookie header. */
export function refreshCookie(setCookie: string | string[] | undefined): string {
  const header = (Array.isArray(setCookie) ? setCookie : [setCookie ?? '']).find((c) =>
    c.startsWith('sb_refresh='),
  );
  const value = header?.split(';')[0]?.split('=')[1];
  if (!value) throw new Error('No sb_refresh cookie was set');
  return value;
}
