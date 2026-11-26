import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { EMAIL_QUEUE, EMAIL_SEND_JOB, emailJobSchema } from '@setubandh/shared';
import { UnrecoverableError, type Job } from 'bullmq';
import type { Transporter } from 'nodemailer';
import { ENV, type AppEnv } from '../../core/env';
import { SMTP_TRANSPORT } from './smtp';

/**
 * Sends transactional email queued by the API (M1-14). Retries (5 attempts, exponential backoff)
 * are set by the producer. Logs name the template and job only: never recipient, subject or body.
 */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(SMTP_TRANSPORT) private readonly smtp: Transporter,
    @Inject(ENV) private readonly env: AppEnv,
  ) {
    super();
  }

  async process(job: Job): Promise<{ sent: true }> {
    if (job.name !== EMAIL_SEND_JOB) throw new UnrecoverableError(`Unknown job: ${job.name}`);
    const parsed = emailJobSchema.safeParse(job.data);
    // A malformed job will never succeed: fail it now instead of retrying.
    if (!parsed.success) throw new UnrecoverableError('Invalid email job');
    const { template, to, subject, text, html } = parsed.data;
    try {
      await this.smtp.sendMail({ from: this.env.SMTP_FROM, to, subject, text, html });
    } catch (error) {
      this.logger.warn(
        { jobId: job.id, template, attempt: job.attemptsMade + 1 },
        'Email send failed, will retry',
      );
      throw error;
    }
    this.logger.log({ jobId: job.id, template }, 'Email sent');
    return { sent: true };
  }
}
