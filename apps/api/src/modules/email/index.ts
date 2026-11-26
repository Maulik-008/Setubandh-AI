// Public entry of the email module: typed templates. Send them with MailerService (core/mailer).
export {
  channelNeedsAttention,
  existingAccount,
  invitation,
  resetPassword,
  verifyEmail,
  type TemplatedEmail,
} from './templates';
export { escapeHtml } from './layout';
