import pg from 'pg';

export interface DatabaseHealth {
  /** Resolves when the database answers `SELECT 1`; rejects otherwise. */
  check: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * A tiny dedicated pool (1 connection) for readiness probes, kept inside packages/db
 * (rule 1: no raw pool outside this package).
 */
export function createDatabaseHealth(connectionString: string): DatabaseHealth {
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
    application_name: 'setubandh-health',
  });
  pool.on('error', () => undefined);
  return {
    check: async () => {
      await pool.query('SELECT 1');
    },
    close: () => pool.end(),
  };
}
