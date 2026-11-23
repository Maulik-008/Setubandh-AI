import { Controller, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  emailOnlyRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
  twoFactorLoginRequestSchema,
  type MfaChallengeResponse,
  type TwoFactorLoginRequest,
  signupRequestSchema,
  verifyEmailRequestSchema,
  type LoginRequest,
  type SessionResponse,
  type SignupRequest,
} from '@setubandh/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ENV, type AppEnv } from '../../core/env';
import { ZodBody } from '../../core/validation';
import { Public } from './auth.guard';
import type { RequestMeta } from './auth.repository';
import { AuthService, type IssuedSession } from './auth.service';
import { AuthRateLimitGuard } from './rate-limit.guard';
import { REFRESH_TOKEN_TTL_MS } from './tokens';

export const REFRESH_COOKIE = 'sb_refresh';
const ACCEPTED = {
  status: 'accepted',
  message: 'If the details are right, we have sent an email.',
} as const;

function meta(request: FastifyRequest): RequestMeta {
  return { ip: request.ip, userAgent: request.headers['user-agent'] };
}

@Public()
@UseGuards(AuthRateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: AppEnv,
  ) {}

  @Post('signup')
  @HttpCode(202)
  async signup(@ZodBody(signupRequestSchema) body: SignupRequest, @Req() req: FastifyRequest) {
    await this.auth.signup(body, meta(req));
    return ACCEPTED;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @ZodBody(loginRequestSchema) body: LoginRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionResponse | MfaChallengeResponse> {
    const result = await this.auth.login(body, meta(req));
    return 'challenge' in result ? result.challenge : this.withCookie(reply, result);
  }

  @Post('login/2fa')
  @HttpCode(200)
  async loginSecondFactor(
    @ZodBody(twoFactorLoginRequestSchema) body: TwoFactorLoginRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionResponse> {
    return this.withCookie(reply, await this.auth.loginWithSecondFactor(body, meta(req)));
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<SessionResponse> {
    return this.withCookie(reply, await this.auth.refresh(req.cookies[REFRESH_COOKIE], meta(req)));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.auth.logout(req.cookies[REFRESH_COOKIE], meta(req));
    void reply.clearCookie(REFRESH_COOKIE, { path: '/v1/auth' });
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @ZodBody(verifyEmailRequestSchema) body: { token: string },
    @Req() req: FastifyRequest,
  ) {
    await this.auth.verifyEmail(body.token, meta(req));
    return { status: 'verified' as const };
  }

  @Post('resend-verification')
  @HttpCode(202)
  async resendVerification(@ZodBody(emailOnlyRequestSchema) body: { email: string }) {
    await this.auth.resendVerification(body.email);
    return ACCEPTED;
  }

  @Post('forgot-password')
  @HttpCode(202)
  async forgotPassword(
    @ZodBody(emailOnlyRequestSchema) body: { email: string },
    @Req() req: FastifyRequest,
  ) {
    await this.auth.forgotPassword(body.email, meta(req));
    return ACCEPTED;
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @ZodBody(resetPasswordRequestSchema) body: { token: string; password: string },
    @Req() req: FastifyRequest,
  ) {
    await this.auth.resetPassword(body.token, body.password, meta(req));
    return { status: 'reset' as const };
  }

  /** httpOnly, SameSite=Lax, path-scoped refresh cookie (FR-AUTH-03); Secure outside development. */
  private withCookie(reply: FastifyReply, issued: IssuedSession): SessionResponse {
    void reply.setCookie(REFRESH_COOKIE, issued.refreshToken, {
      httpOnly: true,
      secure: this.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      path: '/v1/auth',
      maxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
    });
    return issued.session;
  }
}
