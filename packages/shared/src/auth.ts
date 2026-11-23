import { z } from './zod';

// Auth request/response contracts (FR-AUTH-01..04, 11). Used by the API and the auth screens.

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

const email = z.email().max(254).toLowerCase().trim();
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `Use at least ${PASSWORD_MIN_LENGTH} characters.` })
  .max(PASSWORD_MAX_LENGTH, { error: `Use at most ${PASSWORD_MAX_LENGTH} characters.` });
const token = z.string().min(20).max(200);

export const signupRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email,
    password,
    workspaceName: z.string().trim().min(1).max(120),
    /** Browser time zone (Intl), used to prefill the workspace's country, currency and time zone. */
    timezone: z.string().max(64).optional(),
  })
  .openapi('SignupRequest');

export const loginRequestSchema = z
  .object({ email, password: z.string().min(1).max(PASSWORD_MAX_LENGTH) })
  .openapi('LoginRequest');

export const verifyEmailRequestSchema = z.object({ token }).openapi('VerifyEmailRequest');
export const emailOnlyRequestSchema = z.object({ email }).openapi('EmailOnlyRequest');
export const resetPasswordRequestSchema = z
  .object({ token, password })
  .openapi('ResetPasswordRequest');

export const sessionResponseSchema = z
  .object({
    accessToken: z.string(),
    expiresIn: z.number().int().positive(),
    user: z.object({
      id: z.uuid(),
      email: z.string(),
      name: z.string(),
      emailVerified: z.boolean(),
    }),
  })
  .openapi('SessionResponse');

export const acceptedResponseSchema = z
  .object({ status: z.literal('accepted'), message: z.string() })
  .openapi('AcceptedResponse');

export const meResponseSchema = z
  .object({
    id: z.uuid(),
    email: z.string(),
    name: z.string(),
    emailVerified: z.boolean(),
    locale: z.string(),
    avatarUrl: z.string().nullable(),
  })
  .openapi('MeResponse');

export const updateMeRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    locale: z.string().min(2).max(10).optional(),
    avatarUrl: z.url().max(500).nullable().optional(),
  })
  .openapi('UpdateMeRequest');

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;

// --- Two-step sign-in (FR-AUTH-05) -----------------------------------------------------------

const totpCode = z.string().regex(/^\d{6}$/, { error: 'Enter the 6-digit code from your app.' });

export const mfaChallengeResponseSchema = z
  .object({ mfaRequired: z.literal(true), challengeToken: z.string() })
  .openapi('MfaChallengeResponse');

/** Either an authenticator code or a recovery code, never both. */
export const twoFactorLoginRequestSchema = z
  .union([
    z.object({ challengeToken: token, code: totpCode }).strict(),
    z.object({ challengeToken: token, recoveryCode: z.string().min(10).max(20) }).strict(),
  ])
  .openapi('TwoFactorLoginRequest');

export const twoFactorSetupResponseSchema = z
  .object({ secret: z.string(), otpauthUrl: z.string(), qrSvg: z.string() })
  .openapi('TwoFactorSetupResponse');

export const twoFactorEnableRequestSchema = z
  .object({ code: totpCode })
  .openapi('TwoFactorEnableRequest');

export const recoveryCodesResponseSchema = z
  .object({ recoveryCodes: z.array(z.string()).length(10) })
  .openapi('RecoveryCodesResponse');

export const passwordConfirmRequestSchema = z
  .object({ password: z.string().min(1).max(PASSWORD_MAX_LENGTH) })
  .openapi('PasswordConfirmRequest');

export type MfaChallengeResponse = z.infer<typeof mfaChallengeResponseSchema>;
export type TwoFactorLoginRequest = z.infer<typeof twoFactorLoginRequestSchema>;
export type TwoFactorSetupResponse = z.infer<typeof twoFactorSetupResponseSchema>;
