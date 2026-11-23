import { z } from '@setubandh/shared';

const required = z.string({ error: 'missing' }).min(1, { error: 'missing' });
/** Must be listed in .env but may be empty (empty = feature off, e.g. no SMTP login, Sentry off). */
const presentMayBeEmpty = z.string({ error: 'missing' });

/** Messages are fixed reasons, never the offending value (rule 7: no secrets in logs). */
function hasProtocol(value: string, protocols: string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const httpUrl = required.refine((v) => hasProtocol(v, ['http:', 'https:']), {
  error: 'must be an http(s) URL',
});
const postgresUrl = required.refine((v) => hasProtocol(v, ['postgres:', 'postgresql:']), {
  error: 'must be a postgres:// connection string',
});
const redisUrl = required.refine((v) => hasProtocol(v, ['redis:', 'rediss:']), {
  error: 'must be a redis:// or rediss:// URL',
});
const port = required
  .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535, {
    error: 'must be a port number (1-65535)',
  })
  .transform(Number);
const nodeEnv = z.enum(['development', 'test', 'production'], {
  error: (issue) =>
    issue.input === undefined || issue.input === ''
      ? 'missing'
      : 'must be one of development, test, production',
});
const base64Key32 = required.refine(
  (v) => /^[A-Za-z0-9+/]+={0,2}$/.test(v) && Buffer.from(v, 'base64').length === 32,
  { error: 'must be 32 bytes encoded as base64' },
);
const strongSecret = required.refine((v) => v.length >= 32, {
  error: 'must be at least 32 characters',
});

/**
 * Every environment variable from requirements §15.6. All are required at boot.
 * Keep in sync with `.env.example` (a test enforces this).
 */
export const envSchema = z.object({
  NODE_ENV: nodeEnv,
  APP_URL: httpUrl,
  ADMIN_URL: httpUrl,
  API_URL: httpUrl,
  HOOKS_URL: httpUrl,
  DATABASE_URL: postgresUrl,
  DATABASE_ADMIN_URL: postgresUrl,
  REDIS_URL: redisUrl,
  S3_ENDPOINT: httpUrl,
  S3_BUCKET: required,
  S3_ACCESS_KEY: required,
  S3_SECRET_KEY: required,
  JWT_ACCESS_SECRET: strongSecret,
  JWT_REFRESH_SECRET: strongSecret,
  ENCRYPTION_KEY: base64Key32,
  META_APP_ID: required,
  META_APP_SECRET: required,
  META_VERIFY_TOKEN: required,
  META_GRAPH_VERSION: required,
  META_ES_CONFIG_ID: required,
  ANTHROPIC_API_KEY: required,
  AI_MODEL_DEFAULT: required,
  AI_MODEL_ESCALATION: required,
  EMBEDDINGS_PROVIDER: required,
  EMBEDDINGS_API_KEY: required,
  RAZORPAY_KEY_ID: required,
  RAZORPAY_KEY_SECRET: required,
  RAZORPAY_WEBHOOK_SECRET: required,
  STRIPE_SECRET_KEY: required,
  STRIPE_WEBHOOK_SECRET: required,
  SMTP_HOST: required,
  SMTP_PORT: port,
  SMTP_USER: presentMayBeEmpty,
  SMTP_PASS: presentMayBeEmpty,
  SMTP_FROM: required,
  VAPID_PUBLIC_KEY: required,
  VAPID_PRIVATE_KEY: required,
  SENTRY_DSN: presentMayBeEmpty,
});

export type Env = z.infer<typeof envSchema>;
