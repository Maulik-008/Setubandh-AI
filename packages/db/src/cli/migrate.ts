// `pnpm db:migrate`: apply migrations as orbit_admin (DATABASE_ADMIN_URL), then set the
// orbit_app password from DATABASE_URL. Safe to run repeatedly.
import { loadEnvOrExit } from '@setubandh/env';
import { migrate } from '../migrate';

const env = loadEnvOrExit();
await migrate({ adminUrl: env.DATABASE_ADMIN_URL, appUrl: env.DATABASE_URL });
process.stdout.write('Database migrations applied.\n');
