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
    if (password) {
      await client.query(
        `ALTER ROLE orbit_app WITH LOGIN PASSWORD ${client.escapeLiteral(password)}`,
      );
    }
  } finally {
    await client.end();
  }
}
