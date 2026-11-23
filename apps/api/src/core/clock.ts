import { Global, Module } from '@nestjs/common';

/** Injectable time source so tests can move time (lockout windows, link expiry). */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

@Global()
@Module({
  providers: [{ provide: CLOCK, useValue: { now: () => new Date() } satisfies Clock }],
  exports: [CLOCK],
})
export class ClockModule {}
