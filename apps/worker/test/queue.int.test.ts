import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { migrate } from '@setubandh/db';
import { adminQuery, createTestDatabase, testEnv, type TestDatabase } from '@setubandh/testing';
import { Job, Queue, QueueEvents } from 'bullmq';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ENV } from '../src/core/env';
import {
  AUDIT_PARTITIONS_JOB,
  AUDIT_PARTITIONS_SCHEDULE,
  PLATFORM_QUEUE,
} from '../src/modules/platform';

// M1-03: the worker boots BullMQ v6 on Valkey and processes jobs.
describe('worker BullMQ on Valkey 8.1', () => {
  let app: INestApplicationContext;
  let queue: Queue;
  let events: QueueEvents;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase(inject('postgresUrl'));
    await migrate({ adminUrl: testDb.adminUrl, appUrl: testDb.appUrl });
    // Own Valkey database: the boot test runs a worker on the same container in parallel.
    const env = {
      ...testEnv(),
      NODE_ENV: 'test',
      REDIS_URL: `${inject('valkeyUrl')}/5`,
      DATABASE_URL: testDb.appUrl,
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENV)
      .useValue(env)
      .compile();
    app = await moduleRef.init();
    const connection = { url: env.REDIS_URL };
    queue = new Queue(PLATFORM_QUEUE, { connection });
    events = new QueueEvents(PLATFORM_QUEUE, { connection });
    await events.waitUntilReady();
    // The worker runs the audit-partition job once at boot; let it finish before the tests.
    const boot = await Job.fromId(queue, `${AUDIT_PARTITIONS_JOB}.boot`);
    if (boot) await boot.waitUntilFinished(events, 10_000).catch(() => undefined);
  }, 60_000);

  afterAll(async () => {
    await events?.close();
    await queue?.close();
    await app?.close();
    await testDb?.drop();
  });

  it('processes a platform.ping job end to end', async () => {
    const job = await queue.add('platform.ping', { sentAt: Date.now() });
    const result: unknown = await job.waitUntilFinished(events, 10_000);
    expect(result).toMatchObject({ pong: true });
  });

  it('fails a job with an unknown name instead of silently dropping it', async () => {
    const job = await queue.add('platform.unknown', {}, { attempts: 1 });
    await expect(job.waitUntilFinished(events, 10_000)).rejects.toThrow(/Unknown job/);
  });

  it('keeps audit partitions prepared: recreates a missing future month (M1-12)', async () => {
    const future = new Date();
    future.setUTCDate(1);
    future.setUTCMonth(future.getUTCMonth() + 3);
    const name = `audit_logs_${future.getUTCFullYear()}_${String(future.getUTCMonth() + 1).padStart(2, '0')}`;
    await adminQuery(testDb.adminUrl, `DROP TABLE ${name}`);

    const job = await queue.add(AUDIT_PARTITIONS_JOB, {});
    expect(await job.waitUntilFinished(events, 10_000)).toEqual({ created: 1 });
    const exists = await adminQuery<{ ok: boolean }>(
      testDb.adminUrl,
      `SELECT to_regclass($1) IS NOT NULL AS ok`,
      [name],
    );
    expect(exists).toEqual([{ ok: true }]);
  });

  it('registers the daily audit-partition schedule', async () => {
    const schedulers = await queue.getJobSchedulers();
    expect(schedulers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: AUDIT_PARTITIONS_JOB, pattern: AUDIT_PARTITIONS_SCHEDULE }),
      ]),
    );
  });
});
