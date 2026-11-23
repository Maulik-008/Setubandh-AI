import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { BREACHED_PASSWORDS, HibpBreachedPasswords } from './breached-passwords';
import { AuthRateLimitGuard } from './rate-limit.guard';
import { LoginLockout } from './lockout';
import { TokenService } from './tokens';
import './auth.openapi';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    TokenService,
    LoginLockout,
    AuthRateLimitGuard,
    { provide: BREACHED_PASSWORDS, useFactory: () => new HibpBreachedPasswords() },
    // Every route needs an access token unless it is marked @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
