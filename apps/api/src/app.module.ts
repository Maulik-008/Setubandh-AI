import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ClockModule } from './core/clock';
import { DatabaseModule } from './core/database';
import { EnvModule } from './core/env';
import { AppErrorFilter } from './core/error.filter';
import { LoggingModule } from './core/logging';
import { MailerModule } from './core/mailer';
import { ValkeyModule } from './core/valkey';
import { AuthModule } from './modules/auth';
import { TenancyModule } from './modules/tenancy';
import { UsersModule } from './modules/users';
import { ExampleModule } from './modules/example';
import { HealthModule } from './modules/health';

/** Root module of the api app. Feature modules are added here as tickets land. */
@Module({
  imports: [
    EnvModule,
    ClockModule,
    LoggingModule,
    DatabaseModule,
    ValkeyModule,
    MailerModule,
    AuthModule,
    TenancyModule,
    UsersModule,
    HealthModule,
    ExampleModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AppErrorFilter }],
})
export class AppModule {}
