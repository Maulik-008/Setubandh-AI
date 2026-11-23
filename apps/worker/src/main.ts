import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadEnvOrExit } from '@setubandh/env';
import { AppModule } from './app.module';

/**
 * Worker entry point. Configuration is validated first (M1-02). M1-03 adds BullMQ processors.
 */
async function bootstrap(): Promise<void> {
  loadEnvOrExit();
  const app = await NestFactory.createApplicationContext(AppModule);
  // Until BullMQ processors exist (M1-03) nothing holds the event loop open; keep the process
  // alive explicitly so `pnpm dev` and Docker see a running worker.
  const idle = setInterval(() => undefined, 60_000);
  process.stdout.write('worker started\n');
  closeOnSignal({
    close: async () => {
      clearInterval(idle);
      await app.close();
    },
  });
}

/** Close Nest (running its shutdown hooks) on SIGTERM/SIGINT, then exit 0 so Docker sees a clean stop. */
function closeOnSignal(app: { close: () => Promise<void> }): void {
  const shutdown = (signal: NodeJS.Signals) => {
    process.stdout.write(`worker stopping (${signal})\n`);
    void app.close().then(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void bootstrap();
