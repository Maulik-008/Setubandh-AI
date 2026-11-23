import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { createDatabaseHealth, type DatabaseHealth } from '@setubandh/db';
import { Redis } from 'ioredis';
import { ENV, type AppEnv } from '../../core/env';

/** A dependency check used by /health/ready. Throws (or never settles) when unhealthy. */
export interface HealthProbe {
  check: () => Promise<void>;
}

export const DATABASE_HEALTH = Symbol('DATABASE_HEALTH');
export const VALKEY_HEALTH = Symbol('VALKEY_HEALTH');

@Injectable()
export class DatabaseHealthProbe implements HealthProbe, OnApplicationShutdown {
  private readonly db: DatabaseHealth;

  constructor(@Inject(ENV) env: AppEnv) {
    this.db = createDatabaseHealth(env.DATABASE_URL);
  }

  check(): Promise<void> {
    return this.db.check();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.db.close();
  }
}

@Injectable()
export class ValkeyHealthProbe implements HealthProbe, OnApplicationShutdown {
  private readonly client: Redis;

  constructor(@Inject(ENV) env: AppEnv) {
    this.client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2_000,
      connectionName: 'setubandh-health',
    });
    this.client.on('error', () => undefined);
  }

  async check(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'end') await this.client.connect();
    await this.client.ping();
  }

  onApplicationShutdown(): void {
    this.client.disconnect();
  }
}
