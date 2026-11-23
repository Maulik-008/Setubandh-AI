import type { INestApplicationContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { testEnv } from '@setubandh/testing';
import { Queue, QueueEvents } from 'bullmq';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ENV } from '../src/core/env';
import { PLATFORM_QUEUE } from '../src/modules/platform';

// M1-03: the worker boots BullMQ v6 on Valkey and processes jobs.
describe('worker BullMQ on Valkey 8.1', () => {
  let app: INestApplicationContext;
  let queue: Queue;
  let events: QueueEvents;

  beforeAll(async () => {
    const env = { ...testEnv(), NODE_ENV: 'test', REDIS_URL: inject('valkeyUrl') };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENV)
      .useValue(env)
      .compile();
    app = await moduleRef.init();
    const connection = { url: env.REDIS_URL };
    queue = new Queue(PLATFORM_QUEUE, { connection });
    events = new QueueEvents(PLATFORM_QUEUE, { connection });
    await events.waitUntilReady();
  }, 60_000);

  afterAll(async () => {
    await events?.close();
    await queue?.close();
    await app?.close();
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
});
