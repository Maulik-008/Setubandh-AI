import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

/** Queue for platform-level jobs (`platform.*`), the only jobs allowed without a tenantId (§5.2). */
export const PLATFORM_QUEUE = 'platform';

@Processor(PLATFORM_QUEUE)
export class PlatformProcessor extends WorkerHost {
  private readonly logger = new Logger(PlatformProcessor.name);

  process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'platform.ping':
        // Self-check: proves the worker is connected and consuming jobs.
        return Promise.resolve({ pong: true, at: new Date().toISOString() });
      default:
        this.logger.warn({ jobId: job.id, jobName: job.name }, 'Unknown platform job');
        return Promise.reject(new Error(`Unknown job: ${job.name}`));
    }
  }
}
