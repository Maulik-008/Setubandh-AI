import { fileURLToPath } from 'node:url';
import { spawnApp, testEnv } from '@setubandh/testing';
import { describe, expect, inject, it } from 'vitest';

const worker = (env: Record<string, string>) =>
  spawnApp({
    entry: fileURLToPath(new URL('../src/main.ts', import.meta.url)),
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    swcRegister: import.meta.resolve('@swc-node/register/esm-register'),
    env,
  });

describe('worker boot against real Valkey (M1-02, M1-03)', () => {
  it('starts with a complete environment and shuts down cleanly', async () => {
    const app = worker({ ...testEnv(), REDIS_URL: inject('valkeyUrl') });
    await app.waitForOutput('worker started');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(app.process.exitCode, 'worker must keep running until stopped').toBeNull();
    expect(await app.stop()).toBe(0);
  }, 30_000);
});
