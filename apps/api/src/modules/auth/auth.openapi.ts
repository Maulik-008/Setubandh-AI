import {
  acceptedResponseSchema,
  emailOnlyRequestSchema,
  loginRequestSchema,
  mfaChallengeResponseSchema,
  passwordConfirmRequestSchema,
  recoveryCodesResponseSchema,
  twoFactorEnableRequestSchema,
  twoFactorLoginRequestSchema,
  twoFactorSetupResponseSchema,
  resetPasswordRequestSchema,
  sessionResponseSchema,
  signupRequestSchema,
  verifyEmailRequestSchema,
  z,
} from '@setubandh/shared';
import { registerRoute } from '../../core/openapi';

const json = <T extends z.ZodType>(schema: T) => ({ content: { 'application/json': { schema } } });
const body = <T extends z.ZodType>(schema: T) => ({
  body: { content: { 'application/json': { schema } } },
});

registerRoute({
  method: 'post',
  path: '/v1/auth/signup',
  tags: ['auth'],
  summary: 'Create an account and its first workspace; emails a verification link (always 202)',
  request: body(signupRequestSchema),
  responses: { 202: { description: 'Accepted', ...json(acceptedResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/login',
  tags: ['auth'],
  summary: 'Sign in; sets the sb_refresh cookie (httpOnly, SameSite=Lax, path /v1/auth)',
  request: body(loginRequestSchema),
  responses: {
    200: {
      description: 'Signed in, or a second factor is needed',
      ...json(z.union([sessionResponseSchema, mfaChallengeResponseSchema])),
    },
  },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/refresh',
  tags: ['auth'],
  summary:
    'Rotate the refresh cookie and get a new access token (reuse revokes the session family)',
  responses: { 200: { description: 'New session', ...json(sessionResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/logout',
  tags: ['auth'],
  summary: 'End this session',
  responses: { 204: { description: 'Signed out' } },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/verify-email',
  tags: ['auth'],
  summary: 'Confirm an email address with the link token (24 h, single use)',
  request: body(verifyEmailRequestSchema),
  responses: {
    200: { description: 'Verified', ...json(z.object({ status: z.literal('verified') })) },
  },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/resend-verification',
  tags: ['auth'],
  summary: 'Send the verification link again (always 202)',
  request: body(emailOnlyRequestSchema),
  responses: { 202: { description: 'Accepted', ...json(acceptedResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/forgot-password',
  tags: ['auth'],
  summary: 'Email a password reset link (1 h, single use; always 202)',
  request: body(emailOnlyRequestSchema),
  responses: { 202: { description: 'Accepted', ...json(acceptedResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/reset-password',
  tags: ['auth'],
  summary: 'Set a new password with the link token; signs out every session',
  request: body(resetPasswordRequestSchema),
  responses: {
    200: { description: 'Password changed', ...json(z.object({ status: z.literal('reset') })) },
  },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/login/2fa',
  tags: ['auth'],
  summary: 'Second step: authenticator code or recovery code (challenge is single use, 5 min)',
  request: body(twoFactorLoginRequestSchema),
  responses: { 200: { description: 'Signed in', ...json(sessionResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/me/2fa/setup',
  tags: ['two-factor'],
  summary: 'Start two-step setup: secret, otpauth URI and QR (SVG)',
  responses: { 200: { description: 'Pending secret', ...json(twoFactorSetupResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/me/2fa/enable',
  tags: ['two-factor'],
  summary: 'Confirm a code and turn two-step sign-in on; returns 10 recovery codes once',
  request: body(twoFactorEnableRequestSchema),
  responses: { 200: { description: 'Enabled', ...json(recoveryCodesResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/me/2fa/disable',
  tags: ['two-factor'],
  summary: 'Turn two-step sign-in off (needs the password)',
  request: body(passwordConfirmRequestSchema),
  responses: { 204: { description: 'Disabled' } },
});
