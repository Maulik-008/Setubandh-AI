import { fileURLToPath } from 'node:url';
import { spawnApp, testEnv } from '@setubandh/testing';
import { describe, expect, it } from 'vitest';

const worker = (env: Record<string, string>) =>
  spawnApp({
    entry: fileURLToPath(new URL('../src/main.ts', import.meta.url)),
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    swcRegister: import.meta.resolve('@swc-node/register/esm-register'),
    env,
  });

describe('worker boot (M1-02)', () => {
  it('stops with exit code 1 and names an invalid variable', async () => {
    const app = worker({ ...testEnv(), REDIS_URL: 'http://not-redis' });
    expect(await app.exited).toBe(1);
    expect(app.stderr()).toContain('Invalid environment variable: REDIS_URL');
  }, 30_000);

  it('starts with a complete environment and shuts down cleanly', async () => {
    const app = worker(testEnv());
    await app.waitForOutput('worker started');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(app.process.exitCode, 'worker must keep running until stopped').toBeNull();
    expect(await app.stop()).toBe(0);
  }, 30_000);
});
