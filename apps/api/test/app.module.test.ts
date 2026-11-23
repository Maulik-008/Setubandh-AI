import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ExampleModule, ExampleService } from '../src/modules/example';

// Unit level: module wiring only. The full AppModule (config, logging, health, docs) is booted
// with an explicit test config by test/support/app.ts in the HTTP, logging and health tests.
describe('api example module', () => {
  it('resolves the example service through dependency injection', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ExampleModule] }).compile();
    expect(moduleRef.get(ExampleService).describe()).toBe('api example module');
    await moduleRef.close();
  });
});
