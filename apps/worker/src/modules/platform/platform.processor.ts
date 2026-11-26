import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { sql, type Database } from '@setubandh/db';
import type { Job, Queue } from 'bullmq';
import { DATABASE } from '../../core/database';

/** Queue for platform-level jobs (`platform.*`), the only jobs allowed without a tenantId (§5.2). */
export const PLATFORM_QUEUE = 'platform';

/** Keeps monthly audit partitions prepared ahead of time (M1-12). */
export const AUDIT_PARTITIONS_JOB = 'platform.audit-partitions';
export const AUDIT_PARTITIONS_MONTHS_AHEAD = 3;
/** Daily at 02:17 UTC (off the hour so it does not pile up with other schedules). */
export const AUDIT_PARTITIONS_SCHEDULE = '17 2 * * *';

@Processor(PLATFORM_QUEUE)
export class PlatformProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformProcessor.name);

  constructor(
    @InjectQueue(PLATFORM_QUEUE) private readonly queue: Queue,
    @Inject(DATABASE) private readonly db: Database,
  ) {
    super();
  }

  /** Register the daily schedule (idempotent across restarts and replicas) and run once now. */
  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      AUDIT_PARTITIONS_JOB,
      { pattern: AUDIT_PARTITIONS_SCHEDULE, tz: 'UTC' },
      { name: AUDIT_PARTITIONS_JOB },
    );
    await this.queue.add(AUDIT_PARTITIONS_JOB, {}, { jobId: `${AUDIT_PARTITIONS_JOB}.boot` });
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'platform.ping':
        // Self-check: proves the worker is connected and consuming jobs.
        return { pong: true, at: new Date().toISOString() };
      case AUDIT_PARTITIONS_JOB: {
        const { rows } = await this.db.platform.execute<{ created: number }>(
          sql`SELECT app_ensure_audit_partitions(${AUDIT_PARTITIONS_MONTHS_AHEAD}) AS created`,
        );
        const created = rows[0]?.created ?? 0;
        this.logger.log({ jobId: job.id, created }, 'Audit partitions checked');
        return { created };
      }
      default:
        this.logger.warn({ jobId: job.id, jobName: job.name }, 'Unknown platform job');
        throw new Error(`Unknown job: ${job.name}`);
    }
  }
}
