import { Global, Module } from '@nestjs/common';
import { loadEnv, type Env } from '@setubandh/env';

/** Injection token for the validated, frozen configuration. */
export const ENV = Symbol('ENV');
export type AppEnv = Readonly<Env>;

/** main.ts validates first (loadEnvOrExit); tests override ENV. */
@Global()
@Module({ providers: [{ provide: ENV, useFactory: () => loadEnv() }], exports: [ENV] })
export class EnvModule {}
