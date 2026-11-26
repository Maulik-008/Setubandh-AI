import { describe, expect, it } from 'vitest';
import {
  channelNeedsAttention,
  existingAccount,
  invitation,
  resetPassword,
  verifyEmail,
  type TemplatedEmail,
} from '../src/modules/email';

// M1-14: every template escapes HTML, has a plain-text part and carries its link in both parts.
const LINK = 'https://app.example.com/verify?token=abc_DEF-123';
const NASTY = '<script>alert("x")</script> & "Co"';

const cases: [string, TemplatedEmail][] = [
  ['verify_email', verifyEmail({ name: NASTY, link: LINK })],
  ['reset_password', resetPassword({ link: LINK })],
  [
    'invitation',
    invitation({ inviterName: NASTY, workspaceName: NASTY, role: 'agent', link: LINK }),
  ],
  [
    'existing_account',
    existingAccount({ loginUrl: LINK, forgotUrl: 'https://app.example.com/forgot' }),
  ],
  [
    'channel_needs_attention',
    channelNeedsAttention({
      workspaceName: NASTY,
      channelName: 'WhatsApp +91 98765 43210',
      problem: 'The access token expired.',
      link: LINK,
    }),
  ],
];

describe('email templates', () => {
  for (const [name, email] of cases) {
    it(`${name}: named, escaped, text part, link in both parts`, () => {
      expect(email.template).toBe(name);
      expect(email.subject.length).toBeGreaterThan(5);
      expect(email.html).not.toContain('<script>');
      expect(email.text).toContain(LINK);
      // The link appears as the button and again as copyable text.
      expect(email.html.split(`href="${LINK}"`).length - 1).toBe(2);
      expect(email.html).toMatch(/^<!doctype html>/);
      expect(email.html).toContain('<html lang="en">');
    });
  }

  it('escapes user-controlled names in HTML but keeps them readable in text', () => {
    const email = invitation({
      inviterName: NASTY,
      workspaceName: 'Kesari',
      role: 'admin',
      link: LINK,
    });
    expect(email.html).toContain('&#60;script&#62;');
    expect(email.text).toContain(NASTY);
    expect(email.text).toContain('as an Admin');
  });

  it('keeps the verify email stable (snapshot of the text part)', () => {
    expect(verifyEmail({ name: 'Asha', link: LINK }).text).toMatchInlineSnapshot(`
      "Welcome, Asha

      Confirm your email address to finish setting up your account. You need a confirmed email to connect WhatsApp, Instagram and Messenger.

      Confirm email: https://app.example.com/verify?token=abc_DEF-123

      This link works once and expires in 24 hours. If you did not sign up, ignore this email.

      --
      You received this email because this address was used on Setubandh AI."
    `);
  });
});
