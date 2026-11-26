import { createTransport, type Transporter } from 'nodemailer';
import type { AppEnv } from '../../core/env';

/** The SMTP connection: Mailpit locally, the provider's SMTP (SES, Resend, Brevo) in production. */
export const SMTP_TRANSPORT = Symbol('SMTP_TRANSPORT');

export function createSmtpTransport(env: AppEnv): Transporter {
  return createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
  });
}
