import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { ENV, type AppEnv } from './env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Where mail goes: SMTP in every environment (Mailpit locally); tests capture it instead. */
export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

function smtpTransport(env: AppEnv): MailTransport {
  const transporter = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
  });
  return {
    send: async (message) => {
      await transporter.sendMail({ from: env.SMTP_FROM, ...message });
    },
  };
}

/**
 * Minimal mailer for M1-09 (verify and reset links). M1-14 adds templates and the full email
 * service. Logs never contain recipients' message bodies or links (rule 7).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(@Inject(MAIL_TRANSPORT) private readonly transport: MailTransport) {}

  async send(message: MailMessage): Promise<void> {
    await this.transport.send(message);
    this.logger.log({ subject: message.subject }, 'Email sent');
  }
}

@Global()
@Module({
  providers: [{ provide: MAIL_TRANSPORT, inject: [ENV], useFactory: smtpTransport }, MailerService],
  exports: [MailerService],
})
export class MailerModule {}
