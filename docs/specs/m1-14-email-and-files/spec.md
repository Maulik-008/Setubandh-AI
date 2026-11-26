# M1-14: Email service and file storage

Ticket: M1-14
Status: ready-for-agent (plan approved 2026-11-26)
Plan: [docs/plan/01-mvp-1-unified-inbox.md §9, week 2](../../plan/01-mvp-1-unified-inbox.md)
Requirements:
- P1-08 (files module: signed upload and download with permission checks; "a signed URL from tenant A cannot be issued for tenant B's file");
- P1-09 (email service with templates; "emails visible in Mailpit; links work end to end");
- §5.2 (object keys `tenants/{tenantId}/...`, short-lived signed URLs after a permission check);
- §12.2 (`POST /files/upload-url`, `GET /files/:id`);
- §4.3 (email by SMTP or a transactional provider; Mailpit locally);
- ADR 0011 (R2 via the S3 API, SeaweedFS locally).

## Problem Statement

Emails today are plain text strings built inline in the auth and invitation code. They are sent inside the request, so a slow or failing mail server slows or fails signup. There is also nowhere to keep files: the inbox (M1-18 and M1-21) needs to store customer media and agents' attachments, and one business must never be able to fetch another business's files.

## Solution

- **Email:** one email service with typed templates and a shared, accessible layout. Sending moves to a background job with retries.
- **Files:** a files module issues short-lived signed upload and download URLs, only after checking the workspace. Every object is stored under the workspace's own prefix.

## Decisions

**Email (`apps/api/src/modules/email`, sending in `apps/worker`):**
- **Templates.** Each template is a typed function: `verifyEmail`, `resetPassword`, `invitation`, `existingAccount` (the duplicate-signup notice) and `channelNeedsAttention`. Each returns `{ subject, text, html }`.
  - A shared layout gives table-based HTML with inline styles (email clients ignore stylesheets) and a plain-text part.
  - Colours are Paper & Pastel values written as hex in this one file only. Email clients cannot read CSS variables; this exception is noted in the file.
  - The layout has one ink button, the link repeated as plain text under the button, and the footer "You received this because…".
  - Every value is HTML-escaped.
  - English only; templates take a `locale` parameter for the Hindi UI (P1).
- **Queue.** The API renders the email and adds a job `email.send` to a new `email` queue: 5 attempts with exponential backoff, removed on completion.
  - The worker sends it over SMTP (`nodemailer`): Mailpit locally, the provider's SMTP in production (SES, Resend and Brevo all offer SMTP).
  - Signup, invite and reset requests no longer wait for the mail server.
- **Job data.** Jobs hold the rendered email, including single-use links, for at most the job's lifetime. They are removed on completion, and failed jobs are kept for 1 day only.
- **Logs.** Logs record the template name and job id, never the recipient, subject or body (rule 7).
- **Wiring.** `channelNeedsAttention` is built and tested now; it is sent by channel health (M1-26).
- **Links.** Links come from `APP_URL` with the M1-13 routes: `/verify?token=`, `/reset?token=`, `/invite?token=`, `/settings/channels`.

**Files (`apps/api/src/modules/files`):**
- **New tenant table `files`.**
  - Columns: id, tenant_id, purpose, storage_key, filename, mime, size_bytes, status, uploaded_by, created_at, completed_at.
  - `purpose` has one value in MVP 1, `attachment`. Later tickets add values to the enum (for example `kb_source`).
  - `status` is `pending` or `ready`.
  - RLS through `tenantIsolationSql`, an index on `(tenant_id, created_at)`, and a seed row plus route fixtures in the isolation suite.
- **Object keys.** `tenants/{tenantId}/{purpose}/{yyyy}/{mm}/{fileId}`. The original filename is never part of the key; it is stored as data and returned in `Content-Disposition`.
- **`POST /v1/files/upload-url`** `{ purpose, filename, mime, sizeBytes }`:
  - checks the MIME type and size against the purpose's allowlist. For attachments this follows WhatsApp's limits: images (JPEG, PNG, WebP) up to 5 MB, video and audio up to 16 MB, documents (PDF, Office, text) up to 100 MB;
  - inserts a `pending` row;
  - returns `{ fileId, uploadUrl, headers, expiresAt }`. The URL is a signed `PUT` valid for 5 minutes, with the content type and length signed in, so the browser cannot upload a different size or type.
- **`POST /v1/files/:id/complete`.** The server checks the stored object (`HEAD`: it exists, and size and type match) and marks the row `ready`.
- **`GET /v1/files/:id`.** Returns `{ url, expiresAt, filename, mime, sizeBytes }`, a signed `GET` valid for 5 minutes, only for `ready` files.
  - The row is read through `withTenant`, so another workspace's id is simply not found (`404`).
  - Downloads are served as an attachment with the original filename, so a malicious HTML or SVG file never renders on our domain.
- **Permissions.** Any member of the workspace may upload and read (`@RequirePermission()`). Attachments belong to conversations, which every role reads in MVP 1. Finer checks (for example "can see this conversation") come with the inbox.
- **Storage client.** `@aws-sdk/client-s3` plus `@aws-sdk/s3-request-presigner`, configured from `S3_ENDPOINT`, `S3_BUCKET` and the keys, with path-style addressing.
  - The same code works on R2 and SeaweedFS.
  - The storage service is the only place that signs URLs, and it refuses any key outside `tenants/{currentTenant}/`.
- **Bucket CORS** (so the browser can `PUT` directly): `s3/create-bucket.sh` sets it locally for `APP_URL`; the deploy notes say how to set it on R2.
- **Out of scope:**
  - cleaning up `pending` uploads that were never completed (a worker job with M1-34 ops);
  - image thumbnails;
  - virus scanning;
  - upload UI (the composer, M1-21).

## Tests

| AC | Test |
|---|---|
| All email links work end to end locally | Integration test on real Postgres, Valkey, worker and **Mailpit** (Testcontainers): signup, verify, forgot-password and invite each produce an email. The test reads it from Mailpit's API, follows the link (path matches the web route, token accepted by the API) and checks the result (verified, password changed, member joined). Browser tests already cover the web routes for those paths. |
| Tenant A cannot obtain a signed URL for tenant B's file | Integration test on real **SeaweedFS**: A uploads a file through the signed URL and completes it. B asking for `GET /v1/files/<A's id>` or `POST .../complete` gets `404`, with no URL issued. The isolation suite also covers the new routes and the `files` table automatically. |

Also covered:
- templates: every template escapes HTML, has a text part, contains its link, and is snapshot-tested;
- MIME and size limits, wrong size or type at completion, an expired signed URL, a download of a `pending` file refused;
- the key always starts with the tenant prefix (property-based);
- the email job retries on SMTP failure and logs no recipient or body.

## Out of scope

- Email digests and the notification centre (M1-29, M6).
- A choice of email provider and domain setup: SPF, DKIM and DMARC, recorded in the deploy notes with M1-34.
- Upload UI.
