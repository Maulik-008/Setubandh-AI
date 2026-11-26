import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { EMAIL_SEND_JOB } from '@setubandh/shared';
import { UnrecoverableError, type Job } from 'bullmq';
import type { Transporter } from 'nodemailer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '../src/core/env';
import { EmailProcessor } from '../src/modules/email';

const env = { SMTP_FROM: 'Setubandh AI <hello@example.com>' } as AppEnv;
const valid = {
  template: 'verify_email',
  to: 'asha@example.com',
  subject: 'Confirm your email for Setubandh AI',
  text: 'Confirm: https://app.example.com/verify?token=abc',
  html: '<p>Confirm</p>',
};
const job = (data: unknown, name = EMAIL_SEND_JOB) =>
  ({ id: '42', name, data, attemptsMade: 0 }) as unknown as Job;

describe('EmailProcessor (M1-14)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends a valid job over SMTP from SMTP_FROM', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const processor = new EmailProcessor({ sendMail } as unknown as Transporter, env);
    await expect(processor.process(job(valid))).resolves.toEqual({ sent: true });
    expect(sendMail).toHaveBeenCalledWith({
      from: env.SMTP_FROM,
      to: valid.to,
      subject: valid.subject,
      text: valid.text,
      html: valid.html,
    });
  });

  it('fails a malformed job without retrying (UnrecoverableError)', async () => {
    const processor = new EmailProcessor({ sendMail: vi.fn() } as unknown as Transporter, env);
    await expect(processor.process(job({ ...valid, to: 'not-an-email' }))).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    await expect(processor.process(job(valid, 'email.other'))).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('rethrows an SMTP failure so BullMQ retries, and logs no recipient, subject or body', async () => {
    const logs: string[] = [];
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(
      (...args: unknown[]) => void logs.push(JSON.stringify(args)),
    );
    vi.spyOn(Logger.prototype, 'log').mockImplementation(
      (...args: unknown[]) => void logs.push(JSON.stringify(args)),
    );
    const failing = new EmailProcessor(
      { sendMail: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) } as unknown as Transporter,
      env,
    );
    await expect(failing.process(job(valid))).rejects.toThrow('ECONNREFUSED');
    const ok = new EmailProcessor(
      { sendMail: vi.fn().mockResolvedValue({}) } as unknown as Transporter,
      env,
    );
    await ok.process(job(valid));
    const all = logs.join('\n');
    expect(all).toContain('verify_email');
    expect(all).not.toContain(valid.to);
    expect(all).not.toContain(valid.subject);
    expect(all).not.toContain('token=');
  });
});
