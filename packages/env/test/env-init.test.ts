import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/index';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const script = join(repoRoot, 'scripts/env-init.mjs');

function tempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'setubandh-init-'));
  copyFileSync(join(repoRoot, '.env.example'), join(dir, '.env.example'));
  return dir;
}

function runInit(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' });
}

describe('pnpm env:init', () => {
  it('creates a .env that passes validation', () => {
    const root = tempRepo();
    const result = runInit(root);
    expect(result.status).toBe(0);
    const env = loadEnv({ envFile: join(root, '.env'), processEnv: {} });
    expect(env.NODE_ENV).toBe('development');
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.DATABASE_URL).toMatch(/^postgres:\/\/orbit_app:/);
  });

  it('generates different secrets on every run', () => {
    const [a, b] = [tempRepo(), tempRepo()];
    runInit(a);
    runInit(b);
    const envA = loadEnv({ envFile: join(a, '.env'), processEnv: {} });
    const envB = loadEnv({ envFile: join(b, '.env'), processEnv: {} });
    expect(envA.JWT_ACCESS_SECRET).not.toBe(envB.JWT_ACCESS_SECRET);
    expect(envA.ENCRYPTION_KEY).not.toBe(envB.ENCRYPTION_KEY);
  });

  it('refuses to overwrite an existing .env', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.env'), 'KEEP=me\n');
    const result = runInit(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env already exists');
    expect(readFileSync(join(root, '.env'), 'utf8')).toBe('KEEP=me\n');
  });

  it('overwrites with --force', () => {
    const root = tempRepo();
    writeFileSync(join(root, '.env'), 'KEEP=me\n');
    execFileSync(process.execPath, [script, '--root', root, '--force']);
    expect(() => loadEnv({ envFile: join(root, '.env'), processEnv: {} })).not.toThrow();
  });
});
