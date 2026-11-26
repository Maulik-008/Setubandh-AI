import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EMAIL_QUEUE } from '@setubandh/shared';
import { ENV, type AppEnv } from '../../core/env';
import { EmailProcessor } from './email.processor';
import { createSmtpTransport, SMTP_TRANSPORT } from './smtp';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE })],
  providers: [
    EmailProcessor,
    {
      provide: SMTP_TRANSPORT,
      inject: [ENV],
      useFactory: (env: AppEnv) => createSmtpTransport(env),
    },
  ],
})
export class EmailModule {}
