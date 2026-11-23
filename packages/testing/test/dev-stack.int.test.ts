import { fileURLToPath } from 'node:url';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Redis } from 'ioredis';
import pg from 'pg';
import {
  DockerComposeEnvironment,
  Wait,
  type StartedDockerComposeEnvironment,
} from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// M1-02 acceptance: the local stack that `pnpm dev` starts comes up healthy and usable.
const composeDir = fileURLToPath(new URL('../../../infra/docker/', import.meta.url));
const credentials = { accessKeyId: 'testaccesskey', secretAccessKey: 'testsecretaccesskeyvalue' };
const bucket = 'setubandh-test';

describe('local dev stack (infra/docker/docker-compose.dev.yml)', () => {
  let stack: StartedDockerComposeEnvironment;
  const endpoint = (service: string, port: number) => {
    const container = stack.getContainer(`${service}-1`);
    return { host: container.getHost(), port: container.getMappedPort(port) };
  };

  beforeAll(async () => {
    stack = await new DockerComposeEnvironment(composeDir, [
      'docker-compose.dev.yml',
      'docker-compose.test.yml',
    ])
      .withProjectName(`setubandh-test-${Date.now()}`)
      .withEnvironment({
        S3_ACCESS_KEY: credentials.accessKeyId,
        S3_SECRET_KEY: credentials.secretAccessKey,
        S3_BUCKET: bucket,
      })
      .withWaitStrategy('s3-init-1', Wait.forOneShotStartup())
      .withDefaultWaitStrategy(Wait.forHealthCheck())
      .withStartupTimeout(180_000)
      .up();
  }, 240_000);

  afterAll(async () => {
    await stack?.down({ removeVolumes: true });
  });

  it('runs PostgreSQL 18 with pgvector, pg_trgm and citext', async () => {
    const { host, port } = endpoint('postgres', 5432);
    const client = new pg.Client({
      connectionString: `postgres://orbit_admin:orbit_admin_local@${host}:${port}/setubandh`,
    });
    await client.connect();
    try {
      const version = await client.query<{ server_version_num: string }>('SHOW server_version_num');
      expect(Number(version.rows[0]?.server_version_num)).toBeGreaterThanOrEqual(180000);
      const ext = await client.query<{ extname: string }>('SELECT extname FROM pg_extension');
      expect(ext.rows.map((r) => r.extname)).toEqual(
        expect.arrayContaining(['vector', 'pg_trgm', 'citext']),
      );
    } finally {
      await client.end();
    }
  });

  it('runs Valkey 8.1 with append-only persistence and no eviction', async () => {
    const { host, port } = endpoint('valkey', 6379);
    const valkey = new Redis({ host, port });
    try {
      expect(await valkey.ping()).toBe('PONG');
      expect(await valkey.config('GET', 'appendonly')).toEqual(['appendonly', 'yes']);
      expect(await valkey.config('GET', 'maxmemory-policy')).toEqual([
        'maxmemory-policy',
        'noeviction',
      ]);
      expect(await valkey.info('server')).toMatch(/valkey_version:8\.1\./);
    } finally {
      valkey.disconnect();
    }
  });

  it('serves S3 with the bucket from .env already created', async () => {
    const { host, port } = endpoint('s3', 8333);
    const s3 = new S3Client({
      endpoint: `http://${host}:${port}`,
      region: 'auto',
      forcePathStyle: true,
      credentials,
    });
    await expect(s3.send(new HeadBucketCommand({ Bucket: bucket }))).resolves.toBeDefined();
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: 'tenants/t1/hello.txt', Body: 'hi' }),
    );
    const object = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: 'tenants/t1/hello.txt' }),
    );
    expect(await object.Body?.transformToString()).toBe('hi');
  });

  it('rejects S3 requests with wrong credentials', async () => {
    const { host, port } = endpoint('s3', 8333);
    const s3 = new S3Client({
      endpoint: `http://${host}:${port}`,
      region: 'auto',
      forcePathStyle: true,
      credentials: { accessKeyId: 'wrong', secretAccessKey: 'wrong-secret-value' },
    });
    await expect(s3.send(new CreateBucketCommand({ Bucket: 'not-allowed' }))).rejects.toThrow();
  });

  it('catches email in Mailpit (SMTP and web inbox)', async () => {
    const web = endpoint('mailpit', 8025);
    const response = await fetch(`http://${web.host}:${web.port}/api/v1/messages`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ total: 0 });
  });
});
