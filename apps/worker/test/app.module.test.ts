import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ExampleModule, ExampleService } from '../src/modules/example';

// Unit level: no Valkey here. The full AppModule (BullMQ on Valkey) is covered by
// test/queue.int.test.ts and test/boot.int.test.ts against a real Valkey container.
describe('worker example module', () => {
  it('resolves the example service through dependency injection', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ExampleModule] }).compile();
    expect(moduleRef.get(ExampleService).describe()).toBe('worker example module');
    await moduleRef.close();
  });
});
