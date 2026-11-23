import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import {
  DATABASE_HEALTH,
  DatabaseHealthProbe,
  VALKEY_HEALTH,
  ValkeyHealthProbe,
} from './health.probes';
import { HealthService } from './health.service';
import './health.openapi';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: DATABASE_HEALTH, useClass: DatabaseHealthProbe },
    { provide: VALKEY_HEALTH, useClass: ValkeyHealthProbe },
  ],
})
export class HealthModule {}
