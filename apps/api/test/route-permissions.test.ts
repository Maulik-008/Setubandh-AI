import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { describeRouteAccess } from '../src/core/access';
import { bootApi } from './support/app';

// Rule 3: every endpoint declares @RequirePermission(...), or is explicitly @Public() / @UserScoped().
describe('every route declares who may call it', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await bootApi();
  });
  afterAll(async () => {
    await app.close();
  });

  it('has no route without @Public, @UserScoped or @RequirePermission', () => {
    const routes = describeRouteAccess(app);
    expect(routes.length).toBeGreaterThan(20);
    const undeclared = routes.filter(
      (r) => r.access === 'undeclared' && !r.controller.startsWith('ProbeController'),
    );
    expect(undeclared.map((r) => `${r.controller}.${r.handler}`)).toEqual([]);
  });
});
