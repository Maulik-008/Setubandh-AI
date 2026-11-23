import { UserScoped } from '../../core/access';
import { Controller, Get, Patch } from '@nestjs/common';
import { updateMeRequestSchema, type MeResponse, type UpdateMeRequest } from '@setubandh/shared';
import { ZodBody } from '../../core/validation';
import { CurrentUser, type AuthUser } from '../auth';
import { UsersService } from './users.service';

/** The signed-in user's own profile. User-scoped (no workspace), so no X-Workspace-Id. */
@UserScoped()
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.users.getMe(user.id);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @ZodBody(updateMeRequestSchema) body: UpdateMeRequest,
  ): Promise<MeResponse> {
    return this.users.updateMe(user.id, body);
  }
}
