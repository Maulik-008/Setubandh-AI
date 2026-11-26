import { z } from './zod';

// Background job contracts shared by the API (producer) and the worker (consumer). The worker
// validates every job with these schemas before acting on it (rule 2).

/** Transactional email (M1-14): the API renders, the worker sends over SMTP with retries. */
export const EMAIL_QUEUE = 'email';
export const EMAIL_SEND_JOB = 'email.send';

export const EMAIL_TEMPLATES = [
  'verify_email',
  'reset_password',
  'invitation',
  'existing_account',
  'channel_needs_attention',
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const emailJobSchema = z
  .object({
    template: z.enum(EMAIL_TEMPLATES),
    to: z.email(),
    subject: z.string().min(1).max(200),
    text: z.string().min(1),
    html: z.string().min(1),
  })
  .strict();
export type EmailJob = z.infer<typeof emailJobSchema>;
