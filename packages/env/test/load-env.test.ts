import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from '../src/index';
import { testEnv as validEnv } from '@setubandh/testing';

describe('parseEnv', () => {
  it('names a missing variable', () => {
    const { META_APP_ID: _omitted, ...env } = validEnv();
    expect(() => parseEnv(env)).toThrow(EnvError);
    expect(() => parseEnv(env)).toThrow(
      'Missing environment variable: META_APP_ID (see .env.example)',
    );
  });

  it('names every missing variable, not only the first', () => {
    const { META_APP_ID: _a, REDIS_URL: _b, ...env } = validEnv();
    const error = captureError(() => parseEnv(env));
    expect(error.problems).toEqual([
      'Missing environment variable: REDIS_URL (see .env.example)',
      'Missing environment variable: META_APP_ID (see .env.example)',
    ]);
  });

  it.each(['SMTP_USER', 'SMTP_PASS', 'SENTRY_DSN'])(
    'accepts an empty %s (no SMTP login, Sentry off)',
    (name) => {
      expect(parseEnv({ ...validEnv(), [name]: '' })[name as 'SMTP_USER']).toBe('');
    },
  );

  it.each(['SMTP_USER', 'SMTP_PASS', 'SENTRY_DSN'])('still requires %s to be listed', (name) => {
    const { [name]: _omitted, ...env } = validEnv();
    expect(() => parseEnv(env)).toThrow(`Missing environment variable: ${name}`);
  });

  it('treats an empty required variable as missing', () => {
    expect(() => parseEnv({ ...validEnv(), META_APP_SECRET: '' })).toThrow(
      'Missing environment variable: META_APP_SECRET',
    );
  });
});

describe('parseEnv formats', () => {
  it.each([
    ['APP_URL', 'localhost:5173', 'must be an http(s) URL'],
    ['S3_ENDPOINT', 'not a url', 'must be an http(s) URL'],
    ['DATABASE_URL', 'mysql://u:p@h/db', 'must be a postgres:// connection string'],
    ['DATABASE_ADMIN_URL', 'http://localhost', 'must be a postgres:// connection string'],
    ['REDIS_URL', 'http://localhost:6379', 'must be a redis:// or rediss:// URL'],
    ['SMTP_PORT', 'twenty-five', 'must be a port number (1-65535)'],
    ['SMTP_PORT', '70000', 'must be a port number (1-65535)'],
    ['NODE_ENV', 'staging', 'must be one of development, test, production'],
    ['ENCRYPTION_KEY', 'short', 'must be 32 bytes encoded as base64'],
    ['JWT_ACCESS_SECRET', 'too-short', 'must be at least 32 characters'],
    ['JWT_REFRESH_SECRET', 'too-short', 'must be at least 32 characters'],
  ])('rejects an invalid %s with the reason', (name, value, reason) => {
    expect(() => parseEnv({ ...validEnv(), [name]: value })).toThrow(
      `Invalid environment variable: ${name} ${reason}`,
    );
  });

  it('returns typed values (port as a number)', () => {
    const env = parseEnv(validEnv());
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.NODE_ENV).toBe('development');
  });

  it('never puts a value into the error message', () => {
    const secret = 'super-secret-value-that-must-not-leak';
    const error = captureError(() =>
      parseEnv({ ...validEnv(), JWT_ACCESS_SECRET: 'x', DATABASE_URL: `mysql://${secret}` }),
    );
    expect(error.message).not.toContain(secret);
    expect(error.message).not.toContain('mysql');
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(parseEnv(validEnv()))).toBe(true);
  });
});

function captureError(fn: () => unknown): EnvError {
  try {
    fn();
  } catch (error) {
    if (error instanceof EnvError) return error;
    throw error;
  }
  throw new Error('expected an EnvError');
}
