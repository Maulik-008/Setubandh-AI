import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseEnv as parseDotenv } from 'node:util';
import { EnvError, parseEnv } from './parse';
import type { Env } from './schema';

export interface LoadEnvOptions {
  /** Path of the .env file. Defaults to `.env` at the monorepo root. */
  envFile?: string;
  /** Real environment; wins over the file. Defaults to `process.env`. */
  processEnv?: Record<string, string | undefined>;
}

/**
 * Path of the `.env` file: `SETUBANDH_ENV_FILE` if set (tests, unusual setups), otherwise
 * `.env` at the monorepo root (the folder holding pnpm-workspace.yaml).
 */
export function defaultEnvFile(
  from = process.cwd(),
  processEnv: Record<string, string | undefined> = process.env,
): string {
  if (processEnv.SETUBANDH_ENV_FILE) return processEnv.SETUBANDH_ENV_FILE;
  let dir = from;
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) return join(from, '.env');
    dir = parent;
  }
  return join(dir, '.env');
}

/** Read `.env` (if present), overlay the real environment, validate, and return typed config. */
export function loadEnv(options: LoadEnvOptions = {}): Readonly<Env> {
  const file = options.envFile ?? defaultEnvFile();
  const fromFile = existsSync(file) ? parseDotenv(readFileSync(file, 'utf8')) : {};
  return parseEnv({ ...fromFile, ...(options.processEnv ?? process.env) });
}

export interface LoadEnvOrExitOptions extends LoadEnvOptions {
  exit?: (code: number) => never;
  write?: (text: string) => void;
}

/**
 * Boot helper for apps: on invalid config, print every problem (names and reasons only,
 * never values) and exit with code 1.
 */
export function loadEnvOrExit(options: LoadEnvOrExitOptions = {}): Readonly<Env> {
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const write = options.write ?? ((text: string) => process.stderr.write(text));
  try {
    return loadEnv(options);
  } catch (error) {
    if (!(error instanceof EnvError)) throw error;
    const file = options.envFile ?? defaultEnvFile();
    write(
      [
        'Cannot start: the environment is not valid.',
        ...(existsSync(file)
          ? []
          : [`  No .env file at ${file}. Create one with \`pnpm env:init\`.`]),
        ...error.problems.map((problem) => `  - ${problem}`),
        'Fix .env at the repo root (create one with `pnpm env:init`), then start again.',
        '',
      ].join('\n'),
    );
    return exit(1);
  }
}
