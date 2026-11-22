import 'reflect-metadata';
import type { ModuleMetadata } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';

export interface CreateTestAppOptions {
  /** Hook to override providers (fake clock, fake Meta API, …) before compiling. */
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

/**
 * Boot a NestJS app on the Fastify adapter for API tests. Send requests with `app.inject()`;
 * no port is opened. Always `await app.close()` in `afterAll`.
 */
export async function createTestApp(
  metadata: ModuleMetadata,
  options: CreateTestAppOptions = {},
): Promise<NestFastifyApplication> {
  const builder = Test.createTestingModule(metadata);
  const moduleRef = await (options.override ? options.override(builder) : builder).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
    logger: false,
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
