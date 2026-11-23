import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate as runMigrations } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Apply all migrations as the admin role (requirements §15.4), then set the app role's password
 * from its connection string so the password only ever lives in the environment.
 */
export async function migrate(options: { adminUrl: string; appUrl: string }): Promise<void> {
  const app = new URL(options.appUrl);
  if (decodeURIComponent(app.username) !== 'orbit_app') {
    throw new Error('DATABASE_URL must connect as orbit_app (the role the migrations create)');
  }
  const client = new pg.Client({ connectionString: options.adminUrl });
  await client.connect();
  try {
    await runMigrations(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    const password = decodeURIComponent(app.password);
    if (password) await setAppPassword(client, password);
  } finally {
    await client.end();
  }
}

/**
 * Roles are cluster-wide, so migrations of two databases at once (parallel test files) can update
 * the same role row together; Postgres then reports "tuple concurrently updated". Retry briefly.
 */
async function setAppPassword(client: pg.Client, password: string): Promise<void> {
  const statement = `ALTER ROLE orbit_app WITH LOGIN PASSWORD ${client.escapeLiteral(password)}`;
  for (let attempt = 1; ; attempt++) {
    try {
      await client.query(statement);
      return;
    } catch (error) {
      const concurrent = /tuple concurrently updated/.test((error as Error).message);
      if (!concurrent || attempt >= 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
}
