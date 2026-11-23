import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/** Infrastructure probes (outside /v1). No auth: they reveal only up/down. */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: the process is running. Never checks dependencies. */
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: Postgres and Valkey answer; 503 otherwise. */
  @Get('ready')
  ready() {
    return this.health.readiness();
  }
}
