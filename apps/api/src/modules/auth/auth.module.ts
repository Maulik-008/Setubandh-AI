import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { BREACHED_PASSWORDS, LocalBreachedPasswords } from './breached-passwords';
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
    { provide: BREACHED_PASSWORDS, useClass: LocalBreachedPasswords },
    // Every route needs an access token unless it is marked @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
