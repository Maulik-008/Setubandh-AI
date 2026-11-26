/**
 * The one HTML layout for transactional email (M1-14).
 *
 * Email clients ignore stylesheets and CSS variables, so this file is the single, deliberate
 * exception to "tokens only": the Paper & Pastel light values below are the hex form of
 * packages/ui/src/theme/tokens.ts (light mode). Change them there first, then here.
 *
 * Table layout and inline styles for old clients; one ink button with the link repeated as text
 * (some clients block buttons); a plain-text part with the same content; every value escaped.
 */
const INK = '#181c25'; // foreground / cta (222 20% 12%)
const MUTED = '#616875'; // muted-foreground (220 9% 42%)
const HAIRLINE = '#e2e4e9'; // border (220 15% 90%)
const PAPER = '#ffffff'; // background
const SURFACE = '#f9fafb'; // surface-1 (220 20% 98%)
const LINK = '#1c68e3'; // primary (217 78% 50%)
const FONT = "Geist, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export interface EmailBody {
  /** Hidden preview line shown by inbox lists next to the subject. */
  preheader: string;
  heading: string;
  /** Plain-text paragraphs (escaped here). */
  paragraphs: string[];
  action?: { label: string; url: string };
  /** Shown after the action, e.g. how long the link is valid. */
  note?: string;
  /** Why this person received the email. */
  reason: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderEmail(subject: string, body: EmailBody): RenderedEmail {
  const p = (text: string, color = INK) =>
    `<p style="margin:0 0 16px;font:400 15px/1.6 ${FONT};color:${color};">${escapeHtml(text)}</p>`;
  const action = body.action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;">
        <tr><td style="border-radius:999px;background:${INK};">
          <a href="${escapeHtml(body.action.url)}" style="display:inline-block;padding:12px 24px;font:600 15px/1 ${FONT};color:${PAPER};text-decoration:none;border-radius:999px;">${escapeHtml(body.action.label)}</a>
        </td></tr>
      </table>
      ${p('If the button does not work, copy this link into your browser:', MUTED)}
      <p style="margin:0 0 16px;font:400 13px/1.5 ${FONT};word-break:break-all;"><a href="${escapeHtml(body.action.url)}" style="color:${LINK};">${escapeHtml(body.action.url)}</a></p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${SURFACE};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(body.preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${SURFACE};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${PAPER};border:1px solid ${HAIRLINE};border-radius:24px;">
      <tr><td style="padding:32px;">
        <p style="margin:0 0 24px;font:600 14px/1 ui-monospace, 'Geist Mono', Menlo, monospace;color:${INK};">Setubandh AI</p>
        <h1 style="margin:0 0 16px;font:600 22px/1.3 ${FONT};color:${INK};">${escapeHtml(body.heading)}</h1>
        ${body.paragraphs.map((text) => p(text)).join('\n        ')}
        ${action}
        ${body.note ? p(body.note, MUTED) : ''}
      </td></tr>
    </table>
    <p style="margin:16px 0 0;max-width:560px;font:400 12px/1.5 ${FONT};color:${MUTED};">${escapeHtml(body.reason)}</p>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    body.heading,
    '',
    ...body.paragraphs.flatMap((t) => [t, '']),
    ...(body.action ? [`${body.action.label}: ${body.action.url}`, ''] : []),
    ...(body.note ? [body.note, ''] : []),
    '--',
    body.reason,
  ].join('\n');

  return { subject, text, html };
}
