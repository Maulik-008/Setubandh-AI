import { passwordSchema } from './auth';
import { MEMBERSHIP_ROLES } from './enums';
import { PERMISSIONS } from './permissions';
import { z } from './zod';

// Workspaces, members and invitations (M1-11; requirements §5.2, §6, FR-AUTH-06/07).

const name = z.string().trim().min(1).max(120);
const timezone = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Choose a valid time zone.');

/** Roles that can be given by invitation or role change. Ownership moves only by transfer. */
export const ASSIGNABLE_ROLES = ['admin', 'agent'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
const role = z.enum(MEMBERSHIP_ROLES);
const assignableRole = z.enum(ASSIGNABLE_ROLES);

export const WORKSPACE_ID_HEADER = 'x-workspace-id';
/** Most workspaces a user may own (owned only; memberships elsewhere are unlimited). */
export const MAX_OWNED_WORKSPACES = 3;

export const workspaceSummarySchema = z
  .object({ id: z.uuid(), name: z.string(), role })
  .openapi('WorkspaceSummary');

export const workspaceListResponseSchema = z
  .object({ workspaces: z.array(workspaceSummarySchema), lastWorkspaceId: z.uuid().nullable() })
  .openapi('WorkspaceList');

export const createWorkspaceRequestSchema = z
  .object({ name, timezone: timezone.optional() })
  .strict()
  .openapi('CreateWorkspaceRequest');

export const workspaceResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    timezone: z.string(),
    country: z.string(),
    currency: z.string(),
    agentsSeeAllConversations: z.boolean(),
    role,
    permissions: z.array(z.enum(PERMISSIONS)),
  })
  .openapi('Workspace');

export const updateWorkspaceRequestSchema = z
  .object({ name, timezone, agentsSeeAllConversations: z.boolean() })
  .partial()
  .strict()
  .openapi('UpdateWorkspaceRequest');

export const lastWorkspaceRequestSchema = z
  .object({ workspaceId: z.uuid() })
  .strict()
  .openapi('LastWorkspaceRequest');

export const memberSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    name: z.string(),
    email: z.string(),
    role,
    joinedAt: z.iso.datetime(),
  })
  .openapi('Member');

export const memberListResponseSchema = z
  .object({ members: z.array(memberSchema) })
  .openapi('MemberList');

export const updateMemberRequestSchema = z
  .object({ role: assignableRole })
  .strict()
  .openapi('UpdateMemberRequest');

export const transferOwnershipRequestSchema = z
  .object({ memberId: z.uuid() })
  .strict()
  .openapi('TransferOwnershipRequest');

export const createInvitationRequestSchema = z
  .object({ email: z.email().trim().toLowerCase().max(254), role: assignableRole })
  .strict()
  .openapi('CreateInvitationRequest');

export const invitationSchema = z
  .object({
    id: z.uuid(),
    email: z.string(),
    role: assignableRole,
    expiresAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  })
  .openapi('Invitation');

export const invitationListResponseSchema = z
  .object({ invitations: z.array(invitationSchema) })
  .openapi('InvitationList');

export const acceptInvitationRequestSchema = z
  .object({ token: z.string().min(20).max(200) })
  .strict()
  .openapi('AcceptInvitationRequest');

export const acceptInviteNewAccountRequestSchema = z
  .object({
    token: z.string().min(20).max(200),
    name: z.string().trim().min(1).max(120),
    password: passwordSchema,
  })
  .strict()
  .openapi('AcceptInviteNewAccountRequest');

export const acceptedInvitationResponseSchema = z
  .object({ workspaceId: z.uuid(), role: assignableRole })
  .openapi('AcceptedInvitation');

export type WorkspaceSummary = z.infer<typeof workspaceSummarySchema>;
export type WorkspaceListResponse = z.infer<typeof workspaceListResponseSchema>;
export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceRequestSchema>;
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;
export type UpdateWorkspaceRequest = z.infer<typeof updateWorkspaceRequestSchema>;
export type LastWorkspaceRequest = z.infer<typeof lastWorkspaceRequestSchema>;
export type Member = z.infer<typeof memberSchema>;
export type MemberListResponse = z.infer<typeof memberListResponseSchema>;
export type UpdateMemberRequest = z.infer<typeof updateMemberRequestSchema>;
export type TransferOwnershipRequest = z.infer<typeof transferOwnershipRequestSchema>;
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>;
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;
export type AcceptInviteNewAccountRequest = z.infer<typeof acceptInviteNewAccountRequestSchema>;
export type AcceptedInvitationResponse = z.infer<typeof acceptedInvitationResponseSchema>;
