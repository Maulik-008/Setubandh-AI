import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadEnvOrExit } from '@setubandh/env';
import { AppModule } from './app.module';
import { configureApp, createFastifyAdapter } from './app.setup';

/** API entry point. Config is validated before anything else (M1-02). */
async function bootstrap(): Promise<void> {
  const env = loadEnvOrExit();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, createFastifyAdapter(), {
    bufferLogs: true,
  });
  await configureApp(app, env);
  const port = Number(new URL(env.API_URL).port || 3000);
  await app.listen({ port, host: '0.0.0.0' });
  process.stdout.write(`api listening on ${env.API_URL}\n`);
  closeOnSignal(app);
}

/** Stop accepting requests, close Nest (shutdown hooks), then exit 0; force-exit after 25 s. */
function closeOnSignal(app: { close: () => Promise<void> }): void {
  const shutdown = (signal: NodeJS.Signals) => {
    process.stdout.write(`api stopping (${signal})\n`);
    setTimeout(() => process.exit(1), 25_000).unref();
    void app.close().then(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void bootstrap();
