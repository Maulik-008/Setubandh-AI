import { defineConfig } from 'drizzle-kit';

// `pnpm --filter @setubandh/db db:generate` turns schema changes into SQL migrations.
// Hand-written SQL (roles, RLS helpers, policies) goes in custom migrations (`--custom`).
export default defineConfig({
  dialect: 'postgresql',
  // audit.ts is excluded: its partitioned tables come from the hand-written migration 0005.
  schema: ['./src/schema/platform.ts', './src/schema/auth.ts'],
  out: './migrations',
  strict: true,
  verbose: true,
});
