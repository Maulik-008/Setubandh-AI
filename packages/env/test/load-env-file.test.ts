import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { defaultEnvFile, envSchema, loadEnv, loadEnvOrExit } from '../src/index';
import { testEnv as validEnv } from '@setubandh/testing';

function writeEnvFile(values: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'setubandh-env-'));
  const file = join(dir, '.env');
  writeFileSync(
    file,
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
  return file;
}

describe('loadEnv', () => {
  it('reads variables from a .env file', () => {
    const file = writeEnvFile(validEnv());
    expect(loadEnv({ envFile: file, processEnv: {} }).S3_BUCKET).toBe('setubandh-dev');
  });

  it('lets real environment variables override the file', () => {
    const file = writeEnvFile(validEnv());
    const env = loadEnv({ envFile: file, processEnv: { S3_BUCKET: 'from-process' } });
    expect(env.S3_BUCKET).toBe('from-process');
  });

  it('works without a .env file when the process environment is complete', () => {
    const env = loadEnv({ envFile: '/nonexistent/.env', processEnv: validEnv() });
    expect(env.NODE_ENV).toBe('development');
  });
});

describe('defaultEnvFile', () => {
  it('uses SETUBANDH_ENV_FILE when it is set', () => {
    expect(defaultEnvFile('/anywhere', { SETUBANDH_ENV_FILE: '/custom/path/.env' })).toBe(
      '/custom/path/.env',
    );
  });

  it('finds .env at the monorepo root otherwise', () => {
    const here = fileURLToPath(new URL('.', import.meta.url));
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    expect(defaultEnvFile(here, {})).toBe(join(root, '.env'));
  });
});

describe('loadEnvOrExit', () => {
  it('prints each problem and exits with code 1', () => {
    const { META_APP_ID: _omitted, ...env } = validEnv();
    const exit = vi.fn<(code: number) => never>();
    const write = vi.fn<(text: string) => void>();
    loadEnvOrExit({ envFile: '/nonexistent/.env', processEnv: env, exit, write });
    expect(exit).toHaveBeenCalledWith(1);
    const output = write.mock.calls.map(([text]) => text).join('');
    expect(output).toContain('Missing environment variable: META_APP_ID (see .env.example)');
    expect(output).toContain('pnpm env:init');
  });
});

describe('loadEnvOrExit without a .env file', () => {
  it('says the file is missing and how to create it, before listing variables', () => {
    const exit = vi.fn<(code: number) => never>();
    const write = vi.fn<(text: string) => void>();
    loadEnvOrExit({ envFile: '/nonexistent/.env', processEnv: {}, exit, write });
    const output = write.mock.calls.map(([text]) => text).join('');
    expect(output.split('\n')[1]).toBe(
      '  No .env file at /nonexistent/.env. Create one with `pnpm env:init`.',
    );
  });
});

describe('.env.example', () => {
  it('lists exactly the variables the schema validates', () => {
    const example = readFileSync(
      fileURLToPath(new URL('../../../.env.example', import.meta.url)),
      'utf8',
    );
    const keys = example
      .split('\n')
      .map((line) => /^([A-Z0-9_]+)=/.exec(line)?.[1])
      .filter((key): key is string => Boolean(key));
    expect(keys.sort()).toEqual(Object.keys(envSchema.shape).sort());
  });
});
