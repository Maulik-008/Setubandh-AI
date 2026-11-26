import {
  acceptedInvitationResponseSchema,
  acceptedResponseSchema,
  acceptInvitationRequestSchema,
  acceptInviteNewAccountRequestSchema,
  createInvitationRequestSchema,
  createWorkspaceRequestSchema,
  invitationListResponseSchema,
  invitationSchema,
  lastWorkspaceRequestSchema,
  memberListResponseSchema,
  sessionResponseSchema,
  transferOwnershipRequestSchema,
  updateAvailabilityRequestSchema,
  updateMemberRequestSchema,
  updateWorkspaceRequestSchema,
  workspaceListResponseSchema,
  workspaceResponseSchema,
  workspaceSummarySchema,
  z,
} from '@setubandh/shared';
import { registerRoute } from '../../core/openapi';

const json = <T extends z.ZodType>(schema: T) => ({ content: { 'application/json': { schema } } });
const body = <T extends z.ZodType>(schema: T) => ({
  body: { content: { 'application/json': { schema } } },
});
/** Workspace routes name their workspace in this header (requirements §5.2). */
const workspaceHeader = z.object({ 'x-workspace-id': z.uuid() });
const id = z.object({ id: z.uuid() });
const noContent = { 204: { description: 'Done' } };

registerRoute({
  method: 'get',
  path: '/v1/workspaces',
  tags: ['workspaces'],
  summary: 'My workspaces and the one the switcher opened last',
  responses: { 200: { description: 'Workspaces', ...json(workspaceListResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/workspaces',
  tags: ['workspaces'],
  summary: 'Create a workspace and become its Owner (at most 3 owned)',
  request: body(createWorkspaceRequestSchema),
  responses: { 201: { description: 'Created', ...json(workspaceSummarySchema) } },
});
registerRoute({
  method: 'put',
  path: '/v1/me/last-workspace',
  tags: ['workspaces'],
  summary: 'Remember the workspace chosen in the switcher',
  request: body(lastWorkspaceRequestSchema),
  responses: noContent,
});
registerRoute({
  method: 'get',
  path: '/v1/workspace',
  tags: ['workspaces'],
  summary: 'The current workspace with my role and effective permissions',
  request: { headers: workspaceHeader },
  responses: { 200: { description: 'Workspace', ...json(workspaceResponseSchema) } },
});
registerRoute({
  method: 'patch',
  path: '/v1/workspace',
  tags: ['workspaces'],
  summary: 'Update name, time zone or agent visibility (workspace.settings)',
  request: { headers: workspaceHeader, ...body(updateWorkspaceRequestSchema) },
  responses: { 200: { description: 'Updated', ...json(workspaceResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/workspace/transfer-ownership',
  tags: ['members'],
  summary: 'Make another member the Owner; the current Owner becomes Admin',
  request: { headers: workspaceHeader, ...body(transferOwnershipRequestSchema) },
  responses: { 200: { description: 'Transferred' } },
});
registerRoute({
  method: 'get',
  path: '/v1/members',
  tags: ['members'],
  summary: 'Members of the current workspace',
  request: { headers: workspaceHeader },
  responses: { 200: { description: 'Members', ...json(memberListResponseSchema) } },
});
registerRoute({
  method: 'patch',
  path: '/v1/members/me',
  tags: ['members'],
  summary: 'Set my availability in the current workspace',
  request: { headers: workspaceHeader, ...body(updateAvailabilityRequestSchema) },
  responses: { 200: { description: 'Saved', ...json(updateAvailabilityRequestSchema) } },
});
registerRoute({
  method: 'patch',
  path: '/v1/members/{id}',
  tags: ['members'],
  summary: 'Change a member role (members.manage; never the Owner)',
  request: { headers: workspaceHeader, params: id, ...body(updateMemberRequestSchema) },
  responses: noContent,
});
registerRoute({
  method: 'delete',
  path: '/v1/members/{id}',
  tags: ['members'],
  summary: 'Remove a member; their next request is refused',
  request: { headers: workspaceHeader, params: id },
  responses: noContent,
});
registerRoute({
  method: 'get',
  path: '/v1/invitations',
  tags: ['invitations'],
  summary: 'Pending invitations',
  request: { headers: workspaceHeader },
  responses: { 200: { description: 'Invitations', ...json(invitationListResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/invitations',
  tags: ['invitations'],
  summary: 'Invite by email (valid 7 days)',
  request: { headers: workspaceHeader, ...body(createInvitationRequestSchema) },
  responses: { 201: { description: 'Invited', ...json(invitationSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/invitations/{id}/resend',
  tags: ['invitations'],
  summary: 'Send a new link and restart the 7 days',
  request: { headers: workspaceHeader, params: id },
  responses: { 202: { description: 'Sent', ...json(acceptedResponseSchema) } },
});
registerRoute({
  method: 'delete',
  path: '/v1/invitations/{id}',
  tags: ['invitations'],
  summary: 'Revoke an invitation',
  request: { headers: workspaceHeader, params: id },
  responses: noContent,
});
registerRoute({
  method: 'post',
  path: '/v1/invitations/accept',
  tags: ['invitations'],
  summary: 'Accept an invitation sent to my email',
  request: body(acceptInvitationRequestSchema),
  responses: { 200: { description: 'Joined', ...json(acceptedInvitationResponseSchema) } },
});
registerRoute({
  method: 'post',
  path: '/v1/auth/accept-invite',
  tags: ['auth', 'invitations'],
  summary: 'Accept an invitation by creating an account; signs in like login',
  request: body(acceptInviteNewAccountRequestSchema),
  responses: { 200: { description: 'Signed in', ...json(sessionResponseSchema) } },
});
