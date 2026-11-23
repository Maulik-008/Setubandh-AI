import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { errorResponseSchema } from '@setubandh/shared';

/**
 * One registry for the whole API. Each module registers its routes with `registerRoute` using
 * the same Zod schemas it validates with, so the docs can never drift from the code.
 */
export const openApiRegistry = new OpenAPIRegistry();

const ErrorResponse = openApiRegistry.register('ErrorResponse', errorResponseSchema);

/** Standard error responses every route can return (requirements §12.1). */
export const errorResponses = {
  default: {
    description: 'Error in the standard shape',
    content: { 'application/json': { schema: ErrorResponse } },
  },
} satisfies RouteConfig['responses'];

export function registerRoute(route: RouteConfig): void {
  openApiRegistry.registerPath({
    ...route,
    responses: { ...errorResponses, ...route.responses },
  });
}

export function buildOpenApiDocument(): OpenAPIObject {
  return new OpenApiGeneratorV31(openApiRegistry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Setubandh AI API',
      version: 'v1',
      description: 'Tenant API. Errors use the shape in components.schemas.ErrorResponse.',
    },
    servers: [{ url: '/' }],
  }) as unknown as OpenAPIObject;
}

/** Interactive docs at /v1/docs and the raw document at /v1/docs/openapi.json (non-production). */
export function setupOpenApi(app: NestFastifyApplication): void {
  SwaggerModule.setup('v1/docs', app, buildOpenApiDocument(), {
    jsonDocumentUrl: 'v1/docs/openapi.json',
    yamlDocumentUrl: 'v1/docs/openapi.yaml',
    ui: true,
  });
}
