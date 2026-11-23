import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadEnvOrExit } from '@setubandh/env';
import { AppModule } from './app.module';

/**
 * API entry point. Configuration is validated first: a missing or invalid variable stops boot
 * with a message naming it (M1-02). M1-03 adds logging, error handling, health and OpenAPI.
 */
async function bootstrap(): Promise<void> {
  const env = loadEnvOrExit();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = Number(new URL(env.API_URL).port || 3000);
  await app.listen({ port, host: '0.0.0.0' });
  process.stdout.write(`api listening on ${env.API_URL}\n`);
  closeOnSignal(app);
}

/** Close Nest (running its shutdown hooks) on SIGTERM/SIGINT, then exit 0 so Docker sees a clean stop. */
function closeOnSignal(app: { close: () => Promise<void> }): void {
  const shutdown = (signal: NodeJS.Signals) => {
    process.stdout.write(`api stopping (${signal})\n`);
    void app.close().then(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void bootstrap();
