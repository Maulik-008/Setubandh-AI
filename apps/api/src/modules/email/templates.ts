import type { EmailTemplate } from '@setubandh/shared';
import { renderEmail, type RenderedEmail } from './layout';

// Transactional email templates (M1-14). English only in MVP 1; `locale` is accepted now so the
// Hindi UI (P1) can add a second string set without changing callers.

export type Locale = 'en';
export type TemplatedEmail = RenderedEmail & { template: EmailTemplate };

const REASON_ACCOUNT = 'You received this email because this address was used on Setubandh AI.';

export function verifyEmail(input: {
  name: string;
  link: string;
  locale?: Locale;
}): TemplatedEmail {
  return {
    template: 'verify_email',
    ...renderEmail('Confirm your email for Setubandh AI', {
      preheader: 'One click to confirm your email and connect your channels.',
      heading: `Welcome, ${input.name}`,
      paragraphs: [
        'Confirm your email address to finish setting up your account. You need a confirmed email to connect WhatsApp, Instagram and Messenger.',
      ],
      action: { label: 'Confirm email', url: input.link },
      note: 'This link works once and expires in 24 hours. If you did not sign up, ignore this email.',
      reason: REASON_ACCOUNT,
    }),
  };
}

export function resetPassword(input: { link: string; locale?: Locale }): TemplatedEmail {
  return {
    template: 'reset_password',
    ...renderEmail('Reset your Setubandh AI password', {
      preheader: 'Choose a new password. The link expires in 1 hour.',
      heading: 'Choose a new password',
      paragraphs: [
        'Someone asked to reset the password for your Setubandh AI account. If it was you, choose a new password below. Every device signed in to your account is signed out afterwards.',
      ],
      action: { label: 'Choose a new password', url: input.link },
      note: 'This link works once and expires in 1 hour. If you did not ask for it, ignore this email: your password stays the same.',
      reason: REASON_ACCOUNT,
    }),
  };
}

export function invitation(input: {
  inviterName: string;
  workspaceName: string;
  role: 'admin' | 'agent';
  link: string;
  locale?: Locale;
}): TemplatedEmail {
  const role = input.role === 'admin' ? 'an Admin' : 'an Agent';
  return {
    template: 'invitation',
    ...renderEmail(`${input.inviterName} invited you to ${input.workspaceName} on Setubandh AI`, {
      preheader: `Join ${input.workspaceName} to answer customer messages with your team.`,
      heading: `Join ${input.workspaceName}`,
      paragraphs: [
        `${input.inviterName} invited you to join ${input.workspaceName} on Setubandh AI as ${role}. Setubandh AI is a shared inbox for WhatsApp, Instagram and Messenger.`,
      ],
      action: { label: 'Accept invitation', url: input.link },
      note: 'This invitation expires in 7 days. If you did not expect it, ignore this email.',
      reason: `You received this email because ${input.inviterName} invited this address.`,
    }),
  };
}

export function existingAccount(input: {
  loginUrl: string;
  forgotUrl: string;
  locale?: Locale;
}): TemplatedEmail {
  return {
    template: 'existing_account',
    ...renderEmail('You already have a Setubandh AI account', {
      preheader: 'Someone tried to sign up with this email.',
      heading: 'You already have an account',
      paragraphs: [
        'Someone tried to create a Setubandh AI account with this email, but one already exists. If it was you, sign in instead. If you forgot your password, you can reset it.',
        `Reset your password: ${input.forgotUrl}`,
      ],
      action: { label: 'Sign in', url: input.loginUrl },
      note: 'If it was not you, ignore this email. Nothing has changed.',
      reason: REASON_ACCOUNT,
    }),
  };
}

export function channelNeedsAttention(input: {
  workspaceName: string;
  channelName: string;
  problem: string;
  link: string;
  locale?: Locale;
}): TemplatedEmail {
  return {
    template: 'channel_needs_attention',
    ...renderEmail(`${input.channelName} needs attention in ${input.workspaceName}`, {
      preheader: 'Messages may not arrive until you reconnect.',
      heading: `${input.channelName} needs attention`,
      paragraphs: [
        `${input.problem} Until it is fixed, customer messages on this channel may not reach your inbox and replies may fail.`,
      ],
      action: { label: 'Open channel settings', url: input.link },
      reason: `You received this email because you are an Owner or Admin of ${input.workspaceName}.`,
    }),
  };
}
