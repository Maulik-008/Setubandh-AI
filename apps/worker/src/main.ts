import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadEnvOrExit } from '@setubandh/env';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

/** Worker entry point: config first (M1-02), then BullMQ processors (M1-03). */
async function bootstrap(): Promise<void> {
  loadEnvOrExit();
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  await app.init();
  process.stdout.write('worker started\n');
  closeOnSignal(app);
}

/** Finish in-flight jobs (Nest closes BullMQ workers), then exit 0; force-exit after 25 s. */
function closeOnSignal(app: { close: () => Promise<void> }): void {
  const shutdown = (signal: NodeJS.Signals) => {
    process.stdout.write(`worker stopping (${signal})\n`);
    setTimeout(() => process.exit(1), 25_000).unref();
    void app.close().then(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void bootstrap();
