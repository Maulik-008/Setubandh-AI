import { randomBytes } from 'node:crypto';
import pg from 'pg';

/**
 * Roles are cluster-wide in Postgres, so every test database shares one orbit_app password.
 * (Different passwords per test file would race when files run in parallel.)
 */
export const TEST_APP_PASSWORD = 'orbit_app_test_password';

export interface TestDatabase {
  name: string;
  /** URL as orbit_app (the app role) once migrations have run. */
  appUrl: string;
  /** Superuser URL for the new database (stands in for orbit_admin, which runs migrations). */
  adminUrl: string;
  /** Builds a URL for the same database as another role. */
  urlFor: (user: string, password: string) => string;
  drop: () => Promise<void>;
}

/** Create an empty database on the shared integration Postgres; each test file gets its own. */
export async function createTestDatabase(superuserUrl: string): Promise<TestDatabase> {
  const name = `t_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: superuserUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const urlFor = (user: string, password: string) => {
    const url = new URL(superuserUrl);
    url.username = user;
    url.password = password;
    url.pathname = `/${name}`;
    return url.toString();
  };
  const adminUrl = (() => {
    const url = new URL(superuserUrl);
    url.pathname = `/${name}`;
    return url.toString();
  })();
  return {
    name,
    adminUrl,
    appUrl: urlFor('orbit_app', TEST_APP_PASSWORD),
    urlFor,
    drop: async () => {
      const client = new pg.Client({ connectionString: superuserUrl });
      await client.connect();
      try {
        await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await client.end();
      }
    },
  };
}

/** Run SQL as a superuser in tests (to inspect rows the API wrote). */
export async function adminQuery<T extends pg.QueryResultRow>(
  connectionString: string,
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return (await client.query<T>(text, values)).rows;
  } finally {
    await client.end();
  }
}
