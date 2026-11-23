import { envSchema, type Env } from './schema';

/** Thrown when the environment is incomplete or invalid. The message never contains values. */
export class EnvError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('\n'));
    this.name = 'EnvError';
  }
}

/** Validate a raw environment (e.g. `process.env`) and return the typed, frozen config. */
export function parseEnv(raw: Record<string, string | undefined>): Readonly<Env> {
  const result = envSchema.safeParse(raw);
  if (result.success) return Object.freeze(result.data);
  const problems = result.error.issues.map((issue) => {
    const name = String(issue.path[0]);
    return issue.message === 'missing'
      ? `Missing environment variable: ${name} (see .env.example)`
      : `Invalid environment variable: ${name} ${issue.message}`;
  });
  throw new EnvError(problems);
}
