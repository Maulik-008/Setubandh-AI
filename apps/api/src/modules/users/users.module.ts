import { Module } from '@nestjs/common';
import { meResponseSchema, updateMeRequestSchema } from '@setubandh/shared';
import { registerRoute } from '../../core/openapi';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const json = { content: { 'application/json': { schema: meResponseSchema } } };
registerRoute({
  method: 'get',
  path: '/v1/me',
  tags: ['users'],
  summary: 'The signed-in user',
  responses: { 200: { description: 'Me', ...json } },
});
registerRoute({
  method: 'patch',
  path: '/v1/me',
  tags: ['users'],
  summary: 'Update name, locale or avatar',
  request: { body: { content: { 'application/json': { schema: updateMeRequestSchema } } } },
  responses: { 200: { description: 'Updated', ...json } },
});

@Module({ controllers: [UsersController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
