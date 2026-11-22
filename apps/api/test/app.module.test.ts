import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ExampleService } from '../src/modules/example';

describe('api AppModule', () => {
  it('resolves the example service through dependency injection', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef.get(ExampleService).describe()).toBe('api example module');
    await moduleRef.close();
  });
});
