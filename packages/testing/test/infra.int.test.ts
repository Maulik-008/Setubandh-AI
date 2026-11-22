import { Redis } from 'ioredis';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

describe('integration infrastructure (Testcontainers)', () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: inject('postgresUrl') });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('runs PostgreSQL 18', async () => {
    const { rows } = await client.query<{ server_version_num: string }>('SHOW server_version_num');
    expect(Number(rows[0]?.server_version_num)).toBeGreaterThanOrEqual(180000);
  });

  it('has pgvector available and computes vector distances', async () => {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    const { rows } = await client.query<{ distance: number }>(
      "SELECT '[1,0,0]'::vector <-> '[0,0,0]'::vector AS distance",
    );
    expect(rows[0]?.distance).toBe(1);
  });

  it('runs Valkey and answers PING', async () => {
    const valkey = new Redis(inject('valkeyUrl'), { lazyConnect: true });
    await valkey.connect();
    expect(await valkey.ping()).toBe('PONG');
    const info = await valkey.info('server');
    expect(info).toMatch(/valkey_version:8\.1\./);
    valkey.disconnect();
  });
});
