import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../auth';
import { AcceptInviteController, InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { MembersController, OwnershipController } from './members.controller';
import { MembersService } from './members.service';
import { TenancyRepository } from './tenancy.repository';
import { TenantGuard } from './tenant.guard';
import {
  CurrentWorkspaceController,
  LastWorkspaceController,
  WorkspacesController,
} from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import './tenancy.openapi';

/**
 * Workspaces, members, invitations and roles (M1-11). Import after AuthModule: its TenantGuard
 * runs after AuthGuard and needs the signed-in user.
 */
@Module({
  imports: [AuthModule],
  controllers: [
    WorkspacesController,
    CurrentWorkspaceController,
    LastWorkspaceController,
    MembersController,
    OwnershipController,
    InvitationsController,
    AcceptInviteController,
  ],
  providers: [
    TenancyRepository,
    WorkspacesService,
    MembersService,
    InvitationsService,
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class TenancyModule {}
