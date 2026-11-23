#!/usr/bin/env node
// Create a local .env from .env.example with working development defaults (ticket M1-02).
// Usage: pnpm env:init [--force]   (tests pass --root <dir>)
// Secrets are random per machine. Third-party keys get placeholders; replace them when a
// ticket needs the real service (Meta in M1-08/M1-15, Anthropic in MVP 2, billing in M3).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    force: { type: 'boolean', default: false },
    root: { type: 'string', default: resolve(import.meta.dirname, '..') },
  },
});

const root = resolve(values.root);
const examplePath = join(root, '.env.example');
const envPath = join(root, '.env');

if (existsSync(envPath) && !values.force) {
  process.stderr.write(
    '.env already exists; nothing changed. Use `pnpm env:init --force` to replace it.\n',
  );
  process.exit(1);
}

const secret = (bytes) => randomBytes(bytes).toString('base64url');
const PLACEHOLDER = 'local-placeholder';

// Local values that match infra/docker/docker-compose.dev.yml. The database passwords are
// fixed local-only values (ports are bound to 127.0.0.1); every other secret is random.
const defaults = {
  NODE_ENV: 'development',
  APP_URL: 'http://localhost:5173',
  ADMIN_URL: 'http://localhost:5174',
  API_URL: 'http://localhost:3000',
  HOOKS_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgres://orbit_app:orbit_app_local@127.0.0.1:5432/setubandh',
  DATABASE_ADMIN_URL: 'postgres://orbit_admin:orbit_admin_local@127.0.0.1:5432/setubandh',
  REDIS_URL: 'redis://127.0.0.1:6379',
  S3_ENDPOINT: 'http://127.0.0.1:8333',
  S3_BUCKET: 'setubandh-local',
  S3_ACCESS_KEY: `local${secret(9)}`,
  S3_SECRET_KEY: secret(30),
  JWT_ACCESS_SECRET: secret(48),
  JWT_REFRESH_SECRET: secret(48),
  ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  META_APP_ID: PLACEHOLDER,
  META_APP_SECRET: PLACEHOLDER,
  META_VERIFY_TOKEN: secret(24),
  META_GRAPH_VERSION: 'v24.0',
  META_ES_CONFIG_ID: PLACEHOLDER,
  ANTHROPIC_API_KEY: PLACEHOLDER,
  AI_MODEL_DEFAULT: 'claude-haiku-5-5',
  AI_MODEL_ESCALATION: 'claude-sonnet-5-5',
  EMBEDDINGS_PROVIDER: PLACEHOLDER,
  EMBEDDINGS_API_KEY: PLACEHOLDER,
  RAZORPAY_KEY_ID: PLACEHOLDER,
  RAZORPAY_KEY_SECRET: PLACEHOLDER,
  RAZORPAY_WEBHOOK_SECRET: PLACEHOLDER,
  STRIPE_SECRET_KEY: PLACEHOLDER,
  STRIPE_WEBHOOK_SECRET: PLACEHOLDER,
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: '"Setubandh AI (local)" <no-reply@localhost>',
  VAPID_PUBLIC_KEY: PLACEHOLDER,
  VAPID_PRIVATE_KEY: PLACEHOLDER,
  SENTRY_DSN: '',
};

const unknown = [];
const output = readFileSync(examplePath, 'utf8')
  .split('\n')
  .map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (!match) return line;
    const key = match[1];
    if (!(key in defaults)) {
      unknown.push(key);
      return line;
    }
    const value = defaults[key];
    return `${key}=${/[\s"#]/.test(value) ? `'${value}'` : value}`;
  })
  .join('\n');

if (unknown.length > 0) {
  process.stderr.write(
    `No local default for: ${unknown.join(', ')}. Add one to scripts/env-init.mjs.\n`,
  );
  process.exit(1);
}

writeFileSync(envPath, output, { mode: 0o600 });
process.stdout.write(
  'Created .env with local defaults. Third-party keys are placeholders until their ticket.\n',
);
