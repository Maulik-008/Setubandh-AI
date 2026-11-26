import {
  downloadUrlResponseSchema,
  fileResponseSchema,
  uploadUrlRequestSchema,
  uploadUrlResponseSchema,
  z,
} from '@setubandh/shared';
import { registerRoute } from '../../core/openapi';

const json = <T extends z.ZodType>(schema: T) => ({ content: { 'application/json': { schema } } });
const workspaceHeader = z.object({ 'x-workspace-id': z.uuid() });
const id = z.object({ id: z.uuid() });

registerRoute({
  method: 'post',
  path: '/v1/files/upload-url',
  tags: ['files'],
  summary: 'Get a signed PUT URL (5 minutes) for one file; type and size are checked first',
  request: { headers: workspaceHeader, body: json(uploadUrlRequestSchema) },
  responses: { 201: { description: 'Upload URL', ...json(uploadUrlResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/files/{id}/complete',
  tags: ['files'],
  summary: 'Confirm the upload: the stored object must match the declared size and type',
  request: { headers: workspaceHeader, params: id },
  responses: { 200: { description: 'Ready', ...json(fileResponseSchema) } },
});
registerRoute({
  method: 'get',
  path: '/v1/files/{id}',
  tags: ['files'],
  summary: 'Get a signed download URL (5 minutes) for a ready file of this workspace',
  request: { headers: workspaceHeader, params: id },
  responses: { 200: { description: 'Download URL', ...json(downloadUrlResponseSchema) } },
});
