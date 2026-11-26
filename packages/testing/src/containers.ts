import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

/** Images pinned to the versions in ADR 0011. */
export const POSTGRES_IMAGE = 'pgvector/pgvector:pg18';
export const VALKEY_IMAGE = 'valkey/valkey:8.1';
/** Same images as infra/docker/docker-compose.dev.yml. */
export const MAILPIT_IMAGE = 'axllent/mailpit:v1.34.0';
export const SEAWEEDFS_IMAGE = 'chrislusf/seaweedfs:4.54';

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

export interface MailpitInfra {
  smtpHost: string;
  smtpPort: number;
  /** Mailpit's HTTP API, e.g. GET {apiUrl}/api/v1/messages. */
  apiUrl: string;
  stop: () => Promise<void>;
}

/** Mailpit: catches SMTP mail and exposes it over an HTTP API (M1-14 email tests). */
export async function startMailpit(): Promise<MailpitInfra> {
  const mailpit = await new GenericContainer(MAILPIT_IMAGE)
    .withExposedPorts(1025, 8025)
    .withWaitStrategy(Wait.forHttp('/readyz', 8025))
    .start();
  return {
    smtpHost: mailpit.getHost(),
    smtpPort: mailpit.getMappedPort(1025),
    apiUrl: `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}`,
    stop: async () => {
      await mailpit.stop();
    },
  };
}

export interface S3Infra {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  stop: () => Promise<void>;
}

/** SeaweedFS with its S3 gateway and one bucket (M1-14 file storage tests); R2 speaks the same API. */
export async function startS3(): Promise<S3Infra> {
  const accessKey = 'test-access-key';
  const secretKey = 'test-secret-key-0123456789';
  const bucket = 'setubandh-test';
  const container = await new GenericContainer(SEAWEEDFS_IMAGE)
    .withCommand(['server', '-s3', '-dir=/data', '-ip.bind=0.0.0.0', '-s3.port=8333'])
    .withEnvironment({ AWS_ACCESS_KEY_ID: accessKey, AWS_SECRET_ACCESS_KEY: secretKey })
    .withExposedPorts(8333)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  const endpoint = `http://${container.getHost()}:${container.getMappedPort(8333)}`;
  const client = new S3Client({
    endpoint,
    region: 'auto',
    forcePathStyle: true,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
  // The S3 gateway accepts connections a little before it serves requests.
  for (let attempt = 1; ; attempt++) {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      break;
    } catch (error) {
      if (attempt >= 60) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  client.destroy();
  return {
    endpoint,
    bucket,
    accessKey,
    secretKey,
    stop: async () => {
      await container.stop();
    },
  };
}
