import { z } from './zod';

// File storage contracts (M1-14; requirements §5.2, §12.2). Used by the API and, later, the
// composer's upload (M1-21).

export const FILE_PURPOSES = ['attachment'] as const;
export type FilePurpose = (typeof FILE_PURPOSES)[number];

/** `pending` until the server has checked the stored object (POST /v1/files/:id/complete). */
export const FILE_STATUSES = ['pending', 'ready'] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

const MB = 1024 * 1024;

/**
 * Allowed types and their size limits per purpose. Attachments follow WhatsApp's media limits
 * (the strictest channel), so anything uploaded can be sent on every channel.
 */
export const FILE_LIMITS: Record<FilePurpose, Record<string, number>> = {
  attachment: {
    'image/jpeg': 5 * MB,
    'image/png': 5 * MB,
    'image/webp': 5 * MB,
    'video/mp4': 16 * MB,
    'video/3gpp': 16 * MB,
    'audio/aac': 16 * MB,
    'audio/mp4': 16 * MB,
    'audio/mpeg': 16 * MB,
    'audio/amr': 16 * MB,
    'audio/ogg': 16 * MB,
    'application/pdf': 100 * MB,
    'text/plain': 100 * MB,
    'application/msword': 100 * MB,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 100 * MB,
    'application/vnd.ms-excel': 100 * MB,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 100 * MB,
    'application/vnd.ms-powerpoint': 100 * MB,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 100 * MB,
  },
};

/** Signed URLs live this long (requirements §5.2: short-lived). */
export const SIGNED_URL_TTL_SECONDS = 300;

const formatMb = (bytes: number) => `${Math.round(bytes / MB)} MB`;

export const uploadUrlRequestSchema = z
  .object({
    purpose: z.enum(FILE_PURPOSES),
    // Names travel as data only (never in the storage key); control characters are refused.
    filename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(
        // No control characters (code points below 32, and DEL).
        (name) => ![...name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
        'Rename the file: it contains control characters.',
      ),
    mime: z.string().trim().toLowerCase().max(127),
    sizeBytes: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const limit = FILE_LIMITS[value.purpose][value.mime];
    if (limit === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['mime'],
        message:
          'This file type cannot be sent. Use an image, video, audio file, PDF or Office document.',
      });
    } else if (value.sizeBytes > limit) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizeBytes'],
        message: `This file is too large. The limit for this type is ${formatMb(limit)}.`,
      });
    }
  })
  .openapi('UploadUrlRequest');

export const uploadUrlResponseSchema = z
  .object({
    fileId: z.uuid(),
    uploadUrl: z.url(),
    /** Send exactly these headers with the PUT (they are part of the signature). */
    headers: z.record(z.string(), z.string()),
    expiresAt: z.iso.datetime(),
  })
  .openapi('UploadUrlResponse');

export const fileResponseSchema = z
  .object({
    id: z.uuid(),
    purpose: z.enum(FILE_PURPOSES),
    filename: z.string(),
    mime: z.string(),
    sizeBytes: z.number().int(),
    status: z.enum(FILE_STATUSES),
  })
  .openapi('File');

export const downloadUrlResponseSchema = fileResponseSchema
  .extend({ url: z.url(), expiresAt: z.iso.datetime() })
  .openapi('FileDownload');

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type FileResponse = z.infer<typeof fileResponseSchema>;
export type DownloadUrlResponse = z.infer<typeof downloadUrlResponseSchema>;
