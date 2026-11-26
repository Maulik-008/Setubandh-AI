import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { EMAIL_QUEUE, EMAIL_SEND_JOB, type EmailJob, type EmailTemplate } from '@setubandh/shared';
import { Queue } from 'bullmq';
import { ENV, type AppEnv } from './env';

/** A rendered email for one recipient (the job the worker sends). */
export type MailMessage = EmailJob;

/** Where mail goes: the `email` queue (the worker sends it over SMTP); tests capture it instead. */
export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/**
 * Production transport: one job per email on the `email` queue. The worker sends it with 5
 * attempts and exponential backoff, so a slow or failing mail server never slows a request.
 * Jobs hold single-use links, so they are removed on completion and kept 1 day when failed.
 */
export class QueueMailTransport implements MailTransport, OnApplicationShutdown {
  private queue: Queue | undefined;

  constructor(private readonly redisUrl: string) {}

  /** Connects on first use, so an API that sends no email never opens this connection. */
  private get emailQueue(): Queue {
    this.queue ??= new Queue(EMAIL_QUEUE, {
      connection: { url: this.redisUrl, connectionName: 'setubandh-api-email' },
    });
    return this.queue;
  }

  async send(message: MailMessage): Promise<void> {
    await this.emailQueue.add(EMAIL_SEND_JOB, message, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: { age: 24 * 3600 },
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue?.close();
  }
}

/** Sends templated email. Logs name the template only: never recipient, subject or body (rule 7). */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(@Inject(MAIL_TRANSPORT) private readonly transport: MailTransport) {}

  async send(
    to: string,
    email: { template: EmailTemplate; subject: string; text: string; html: string },
  ): Promise<void> {
    await this.transport.send({ to, ...email });
    this.logger.log({ template: email.template }, 'Email queued');
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ENV],
      useFactory: (env: AppEnv) => new QueueMailTransport(env.REDIS_URL),
    },
    MailerService,
  ],
  exports: [MailerService],
})
export class MailerModule {}
