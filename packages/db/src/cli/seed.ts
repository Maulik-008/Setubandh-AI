// `pnpm db:seed`: local demo data (development only).
import { loadEnvOrExit } from '@setubandh/env';
import { createDatabase } from '../client';
import { seed } from '../seed';

const env = loadEnvOrExit();
if (env.NODE_ENV === 'production') {
  process.stderr.write('Refusing to seed demo data in production.\n');
  process.exit(1);
}
const db = createDatabase(env.DATABASE_URL, { max: 1 });
try {
  const { tenantId } = await seed(db);
  process.stdout.write(`Seeded demo workspace (tenant ${tenantId}).\n`);
} finally {
  await db.close();
}
