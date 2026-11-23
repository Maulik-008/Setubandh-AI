import { z } from './zod';

/**
 * Every error code the API can return (requirements §12.1). Messages are plain language a user
 * can act on; endpoints may pass a more specific message. Add codes here, never inline.
 */
export const ERROR_CODES = {
  BAD_REQUEST: {
    status: 400,
    message: 'The request could not be read. Check its format and try again.',
  },
  UNAUTHENTICATED: { status: 401, message: 'Please sign in to continue.' },
  FORBIDDEN: { status: 403, message: 'You do not have permission to do this.' },
  NOT_FOUND: { status: 404, message: 'We could not find what you asked for.' },
  METHOD_NOT_ALLOWED: { status: 405, message: 'This action is not supported here.' },
  CONFLICT: { status: 409, message: 'This conflicts with a recent change. Refresh and try again.' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'This is too large to upload.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: 'This content type is not supported.' },
  VALIDATION_FAILED: { status: 422, message: 'Some fields need attention.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Wait a moment and try again.' },
  INVALID_CREDENTIALS: { status: 401, message: 'Email or password is incorrect.' },
  SESSION_REVOKED: { status: 401, message: 'Your session has ended. Please sign in again.' },
  TOKEN_INVALID: {
    status: 400,
    message: 'This link is invalid or has expired. Request a new one.',
  },
  EMAIL_NOT_VERIFIED: {
    status: 403,
    message: 'Verify your email address first. Check your inbox for the link.',
  },
  PASSWORD_REJECTED: { status: 422, message: 'Choose a different password.' },
  TOO_MANY_ATTEMPTS: { status: 429, message: 'Too many attempts. Wait 15 minutes and try again.' },
  INTERNAL: { status: 500, message: 'Something went wrong on our side. Please try again.' },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: 'The service is temporarily unavailable. Please try again shortly.',
  },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Throw this for every expected failure; the API error filter turns it into the §12.1 shape. */
export class AppError extends Error {
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    readonly code: ErrorCode,
    options: { message?: string; details?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(options.message ?? ERROR_CODES[code].message, { cause: options.cause });
    this.name = 'AppError';
    this.status = ERROR_CODES[code].status;
    this.details = options.details;
  }
}

/** Response body for every error (requirements §12.1). */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().min(1),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
