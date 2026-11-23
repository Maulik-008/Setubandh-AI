import { z } from '@setubandh/shared';
import { registerRoute } from '../../core/openapi';

const checkStatus = z.enum(['up', 'down']);

registerRoute({
  method: 'get',
  path: '/health/live',
  tags: ['health'],
  summary: 'Liveness: the process is running',
  responses: {
    200: {
      description: 'Alive',
      content: { 'application/json': { schema: z.object({ status: z.literal('ok') }) } },
    },
  },
});

registerRoute({
  method: 'get',
  path: '/health/ready',
  tags: ['health'],
  summary: 'Readiness: Postgres and Valkey answer (503 SERVICE_UNAVAILABLE otherwise)',
  responses: {
    200: {
      description: 'Ready',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
            checks: z.object({ database: checkStatus, valkey: checkStatus }),
          }),
        },
      },
    },
  },
});
