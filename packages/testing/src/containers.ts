import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

/** Images pinned to the versions in ADR 0011. */
export const POSTGRES_IMAGE = 'pgvector/pgvector:pg18';
export const VALKEY_IMAGE = 'valkey/valkey:8.1';

export interface TestInfra {
  /** Superuser connection URL for the throwaway Postgres database. */
  postgresUrl: string;
  /** redis:// URL for the throwaway Valkey instance. */
  valkeyUrl: string;
  stop: () => Promise<void>;
}

/** Start Postgres 18 (with pgvector available) and Valkey 8.1 for one test run. */
export async function startTestInfra(): Promise<TestInfra> {
  const [postgres, valkey]: [StartedPostgreSqlContainer, StartedTestContainer] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase('setubandh_test')
      .withUsername('setubandh')
      .withPassword('setubandh')
      .start(),
    new GenericContainer(VALKEY_IMAGE)
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start(),
  ]);

  return {
    postgresUrl: postgres.getConnectionUri(),
    valkeyUrl: `redis://${valkey.getHost()}:${valkey.getMappedPort(6379)}`,
    stop: async () => {
      await Promise.all([postgres.stop(), valkey.stop()]);
    },
  };
}
