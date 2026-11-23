import { defineConfig } from 'drizzle-kit';

// `pnpm --filter @setubandh/db db:generate` turns schema changes into SQL migrations.
// Hand-written SQL (roles, RLS helpers, policies) goes in custom migrations (`--custom`).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  strict: true,
  verbose: true,
});
