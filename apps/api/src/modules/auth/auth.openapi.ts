import {
  acceptedResponseSchema,
  emailOnlyRequestSchema,
  loginRequestSchema,
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
  responses: { 200: { description: 'Signed in', ...json(sessionResponseSchema) } },
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
