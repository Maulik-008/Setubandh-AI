# Storage and email setup (production and staging)

What the operator sets up outside the code for file storage and email (M1-14). Locally, `pnpm dev:services` starts SeaweedFS and Mailpit and needs none of this.

## Cloudflare R2 (file storage)

1. Create a bucket per environment (for example `setubandh-prod`, `setubandh-staging`). Public access stays **off**: every download goes through a 5-minute signed URL issued by the API.
2. Create an R2 API token with **Object Read & Write**, limited to that bucket. Set:

   | Variable | Value |
   |---|---|
   | `S3_ENDPOINT` | `https://<account id>.r2.cloudflarestorage.com` |
   | `S3_BUCKET` | the bucket name |
   | `S3_ACCESS_KEY` / `S3_SECRET_KEY` | the token's access key id and secret |

3. Set **CORS** on the bucket so the browser can upload directly with the signed URL, from the web app's origin only:

   ```json
   [
     {
       "AllowedOrigins": ["https://app.yourdomain.com"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 600
     }
   ]
   ```

4. Nothing else is needed for checksums: the API asks the AWS SDK to add checksums only where S3 requires them (`requestChecksumCalculation: WHEN_REQUIRED`). Without that setting, the SDK signs a checksum into presigned uploads, and R2 rejects them with `BadDigest`.
5. Object keys are `tenants/{tenantId}/{purpose}/{yyyy}/{mm}/{fileId}`. Deleting a workspace's files (M1-32) removes that prefix.

## Transactional email (SMTP)

The worker sends every email over SMTP; the API only queues it (`email` queue, 5 attempts).

1. Pick a provider with an SMTP endpoint (Amazon SES, Resend or Brevo; requirements §4.3), and verify the sending domain there.
2. Add the provider's **SPF** and **DKIM** DNS records, and a **DMARC** record (`v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`), so emails land in inboxes and not in spam.
3. Set `SMTP_HOST`, `SMTP_PORT` (587 with STARTTLS, or 465), `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` (for example `Setubandh AI <hello@yourdomain.com>`) on the **worker**.
4. Check: sign up with a real address on staging. The verify email arrives within a minute, and its link opens `/verify` on the staging app. Failed sends are visible in the queue as failed `email.send` jobs (kept for 1 day), and the worker log shows the template name and job id, never the recipient.
