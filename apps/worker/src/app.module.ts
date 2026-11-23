import { Module } from '@nestjs/common';
import { EnvModule } from './core/env';
import { LoggingModule } from './core/logging';
import { QueueModule } from './core/queue';
import { ExampleModule } from './modules/example';
import { PlatformModule } from './modules/platform';

/** Root module of the worker app: BullMQ processors are added here as tickets land. */
@Module({ imports: [EnvModule, LoggingModule, QueueModule, PlatformModule, ExampleModule] })
export class AppModule {}
