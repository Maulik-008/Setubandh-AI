import { fileURLToPath } from 'node:url';
import { freePort, spawnApp, testEnv } from '@setubandh/testing';
import { describe, expect, it } from 'vitest';

const app = (env: Record<string, string>) =>
  spawnApp({
    entry: fileURLToPath(new URL('../src/main.ts', import.meta.url)),
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    swcRegister: import.meta.resolve('@swc-node/register/esm-register'),
    env,
  });

describe('api boot (M1-02)', () => {
  it('stops with exit code 1 and names a missing variable', async () => {
    const { META_APP_SECRET: _omitted, ...env } = testEnv();
    const api = app(env);
    expect(await api.exited).toBe(1);
    expect(api.stderr()).toContain('Missing environment variable: META_APP_SECRET');
  }, 30_000);

  it('starts with a complete environment and answers HTTP on the API_URL port', async () => {
    const port = await freePort();
    const api = app({ ...testEnv(), API_URL: `http://127.0.0.1:${port}` });
    try {
      await api.waitForOutput('api listening');
      const response = await fetch(`http://127.0.0.1:${port}/does-not-exist`);
      expect(response.status).toBe(404);
    } finally {
      expect(await api.stop()).toBe(0);
    }
  }, 30_000);
});
