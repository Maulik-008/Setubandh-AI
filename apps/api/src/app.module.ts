import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EnvModule } from './core/env';
import { AppErrorFilter } from './core/error.filter';
import { LoggingModule } from './core/logging';
import { ExampleModule } from './modules/example';
import { HealthModule } from './modules/health';

/** Root module of the api app. Feature modules are added here as tickets land. */
@Module({
  imports: [EnvModule, LoggingModule, HealthModule, ExampleModule],
  providers: [{ provide: APP_FILTER, useClass: AppErrorFilter }],
})
export class AppModule {}
