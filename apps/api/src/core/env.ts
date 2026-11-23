import { Global, Module } from '@nestjs/common';
import { loadEnv, type Env } from '@setubandh/env';

/** Injection token for the validated, frozen configuration (`@Inject(ENV) env: AppEnv`). */
export const ENV = Symbol('ENV');
export type AppEnv = Readonly<Env>;

/** Provides the typed config everywhere. main.ts validates first (loadEnvOrExit); tests override ENV. */
@Global()
@Module({ providers: [{ provide: ENV, useFactory: () => loadEnv() }], exports: [ENV] })
export class EnvModule {}
