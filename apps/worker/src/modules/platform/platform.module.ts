import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PLATFORM_QUEUE, PlatformProcessor } from './platform.processor';

@Module({
  imports: [BullModule.registerQueue({ name: PLATFORM_QUEUE })],
  providers: [PlatformProcessor],
})
export class PlatformModule {}
