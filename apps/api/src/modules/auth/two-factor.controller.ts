import { UserScoped } from '../../core/access';
import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import {
  passwordConfirmRequestSchema,
  twoFactorEnableRequestSchema,
  type TwoFactorSetupResponse,
} from '@setubandh/shared';
import type { FastifyRequest } from 'fastify';
import { ZodBody } from '../../core/validation';
import { CurrentUser, type AuthUser } from './auth.guard';
import { TwoFactorService } from './two-factor.service';

const meta = (req: FastifyRequest) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

/** The signed-in user's own two-step sign-in settings (user-scoped, no workspace). */
@UserScoped()
@Controller('me/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactor: TwoFactorService) {}

  @Post('setup')
  @HttpCode(200)
  setup(@CurrentUser() user: AuthUser): Promise<TwoFactorSetupResponse> {
    return this.twoFactor.setup(user.id);
  }

  @Post('enable')
  @HttpCode(200)
  async enable(
    @CurrentUser() user: AuthUser,
    @ZodBody(twoFactorEnableRequestSchema) body: { code: string },
    @Req() req: FastifyRequest,
  ) {
    return { recoveryCodes: await this.twoFactor.enable(user.id, body.code, meta(req)) };
  }

  @Post('disable')
  @HttpCode(204)
  async disable(
    @CurrentUser() user: AuthUser,
    @ZodBody(passwordConfirmRequestSchema) body: { password: string },
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.twoFactor.disable(user.id, body.password, meta(req));
  }
}
