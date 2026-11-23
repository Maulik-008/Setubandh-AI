import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface SpawnedApp {
  process: ChildProcess;
  /** Resolves with the exit code when the process ends. */
  exited: Promise<number | null>;
  stdout: () => string;
  stderr: () => string;
  /** Resolves once stdout contains `text`; rejects if the process exits first or times out. */
  waitForOutput: (text: string, timeoutMs?: number) => Promise<void>;
  stop: () => Promise<number | null>;
}

/** A free TCP port on 127.0.0.1. */
export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

/**
 * Start an app entry point (TypeScript, run through SWC) as a real process, for boot tests.
 * The developer's own `.env` is never read (SETUBANDH_ENV_FILE points at a missing file);
 * pass the whole environment in `env`.
 */
export function spawnApp(options: {
  entry: string;
  /** App folder; the SWC loader resolves from here. */
  cwd: string;
  tsconfig: string;
  swcRegister: string;
  env: Record<string, string>;
}): SpawnedApp {
  let out = '';
  let err = '';
  const child = spawn(
    process.execPath,
    ['--conditions=@setubandh/source', '--import', options.swcRegister, options.entry],
    {
      cwd: options.cwd,
      env: {
        PATH: process.env.PATH ?? '',
        SWC_NODE_PROJECT: options.tsconfig,
        SETUBANDH_ENV_FILE: join(mkdtempSync(join(tmpdir(), 'setubandh-boot-')), 'no.env'),
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (err += chunk.toString()));
  const exited = new Promise<number | null>((resolve) => child.on('exit', (code) => resolve(code)));

  return {
    process: child,
    exited,
    stdout: () => out,
    stderr: () => err,
    waitForOutput: (text, timeoutMs = 20_000) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Timed out waiting for "${text}". stderr: ${err}`)),
          timeoutMs,
        );
        const check = () => {
          if (out.includes(text)) {
            clearTimeout(timer);
            resolve();
          }
        };
        child.stdout.on('data', check);
        void exited.then((code) => {
          clearTimeout(timer);
          if (!out.includes(text)) reject(new Error(`Exited (${code}) before "${text}": ${err}`));
        });
        check();
      }),
    stop: async () => {
      if (child.exitCode === null) child.kill('SIGTERM');
      return exited;
    },
  };
}
