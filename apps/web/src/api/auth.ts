import type {
  AcceptedInvitationResponse,
  LoginRequest,
  MeResponse,
  MfaChallengeResponse,
  SessionResponse,
  SignupRequest,
  TwoFactorLoginRequest,
} from '@setubandh/shared';
import { api } from './client';

// Auth endpoints (M1-09, M1-10, M1-11). Bodies are the shared Zod contracts.

export type LoginResult = SessionResponse | MfaChallengeResponse;
export const isMfaChallenge = (r: LoginResult): r is MfaChallengeResponse => 'mfaRequired' in r;

export const authApi = {
  login: (body: LoginRequest) =>
    api<LoginResult>('/v1/auth/login', { method: 'POST', body, workspace: false }),
  loginWithSecondFactor: (body: TwoFactorLoginRequest) =>
    api<SessionResponse>('/v1/auth/login/2fa', { method: 'POST', body, workspace: false }),
  signup: (body: SignupRequest) =>
    api<void>('/v1/auth/signup', { method: 'POST', body, workspace: false }),
  verifyEmail: (token: string) =>
    api<{ status: 'verified' }>('/v1/auth/verify-email', {
      method: 'POST',
      body: { token },
      workspace: false,
    }),
  resendVerification: (email: string) =>
    api<void>('/v1/auth/resend-verification', {
      method: 'POST',
      body: { email },
      workspace: false,
    }),
  forgotPassword: (email: string) =>
    api<void>('/v1/auth/forgot-password', { method: 'POST', body: { email }, workspace: false }),
  resetPassword: (token: string, password: string) =>
    api<void>('/v1/auth/reset-password', {
      method: 'POST',
      body: { token, password },
      workspace: false,
    }),
  logout: () => api<void>('/v1/auth/logout', { method: 'POST', workspace: false }),
  acceptInviteNewAccount: (body: { token: string; name: string; password: string }) =>
    api<SessionResponse>('/v1/auth/accept-invite', { method: 'POST', body, workspace: false }),
  acceptInvite: (token: string) =>
    api<AcceptedInvitationResponse>('/v1/invitations/accept', {
      method: 'POST',
      body: { token },
      workspace: false,
    }),
  me: () => api<MeResponse>('/v1/me', { workspace: false }),
};
