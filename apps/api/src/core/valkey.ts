import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV, type AppEnv } from './env';

/** Shared Valkey client for counters, locks and caches. Keys are prefixed (requirements §5.2). */
export const VALKEY = Symbol('VALKEY');

@Global()
@Module({
  providers: [
    {
      provide: VALKEY,
      inject: [ENV],
      useFactory: (env: AppEnv) =>
        new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, connectionName: 'setubandh-api' }),
    },
  ],
  exports: [VALKEY],
})
export class ValkeyModule implements OnApplicationShutdown {
  constructor(@Inject(VALKEY) private readonly valkey: Redis) {}

  onApplicationShutdown(): void {
    this.valkey.disconnect();
  }
}
