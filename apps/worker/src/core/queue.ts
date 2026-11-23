import { BullModule } from '@nestjs/bullmq';
import { ENV, type AppEnv } from './env';

/**
 * BullMQ v6 on Valkey. Workers need `maxRetriesPerRequest: null` so blocking commands survive
 * reconnects; Valkey restarts are retried forever with backoff (the process stays up).
 */
export const QueueModule = BullModule.forRootAsync({
  inject: [ENV],
  useFactory: (env: AppEnv) => ({
    connection: {
      url: env.REDIS_URL,
      maxRetriesPerRequest: null,
      connectionName: 'setubandh-worker',
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { age: 24 * 3600, count: 1_000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  }),
});
