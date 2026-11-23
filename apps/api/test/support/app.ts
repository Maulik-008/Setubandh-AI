import { Controller, Get, Module, Post } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp, testEnv, type CreateTestAppOptions } from '@setubandh/testing';
import { AppError, z } from '@setubandh/shared';
import { AppModule } from '../../src/app.module';
import { configureApp, createFastifyAdapter } from '../../src/app.setup';
import { ENV } from '../../src/core/env';
import { ZodBody } from '../../src/core/validation';

export const echoSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

/** Test-only routes that exercise the global error filter and validation pipe. */
@Controller('test')
export class ProbeController {
  @Get('app-error')
  appError(): never {
    throw new AppError('FORBIDDEN', { details: { permission: 'members.invite' } });
  }

  @Get('crash')
  crash(): never {
    throw new Error('secret internal detail: db password is hunter2');
  }

  @Post('echo')
  echo(@ZodBody(echoSchema) body: z.infer<typeof echoSchema>) {
    return body;
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

/** Boot the real API (same adapter and setup as main.ts) plus probe routes, with a test env. */
export async function bootApi(
  envOverrides: Record<string, string> = {},
  override?: CreateTestAppOptions['override'],
): Promise<NestFastifyApplication> {
  const env = { ...testEnv(), NODE_ENV: 'test', ...envOverrides };
  return createTestApp(
    { imports: [AppModule, ProbeModule] },
    {
      adapter: createFastifyAdapter(),
      override: (builder) => {
        const b = builder.overrideProvider(ENV).useValue(env);
        return override ? override(b) : b;
      },
      configure: (app) => configureApp(app, env as never),
    },
  );
}
