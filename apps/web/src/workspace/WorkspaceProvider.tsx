import type {
  CreateWorkspaceRequest,
  Permission,
  WorkspaceListResponse,
  WorkspaceResponse,
  WorkspaceSummary,
} from '@setubandh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, session } from '../api/client';

export const WORKSPACES_KEY = ['workspaces'] as const;

interface WorkspaceContextValue {
  workspaces: WorkspaceSummary[];
  /** The workspace every request acts in (X-Workspace-Id). */
  active: WorkspaceSummary | null;
  /** Its details, my role and effective permissions. */
  current: WorkspaceResponse | undefined;
  listStatus: 'pending' | 'error' | 'success';
  retry: () => void;
  switchTo: (id: string) => void;
  create: (input: CreateWorkspaceRequest) => Promise<WorkspaceSummary>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * The active workspace (FR-AUTH-07): the one the switcher opened last, else the first. Switching
 * remembers the choice on the server and drops every cached query of the previous workspace,
 * so nothing from workspace A can show inside workspace B.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: () => api<WorkspaceListResponse>('/v1/workspaces', { workspace: false }),
  });
  const [chosenId, setChosenId] = useState<string | null>(null);
  const workspaces = useMemo(() => list.data?.workspaces ?? [], [list.data]);
  const isMine = (id: string | null | undefined) => !!id && workspaces.some((w) => w.id === id);
  const activeId = isMine(chosenId)
    ? chosenId
    : isMine(list.data?.lastWorkspaceId)
      ? list.data!.lastWorkspaceId
      : (workspaces[0]?.id ?? null);
  // Set before children render, so their first queries already carry the header.
  session.setWorkspace(activeId);

  const current = useQuery({
    queryKey: [activeId, 'workspace'],
    queryFn: () => api<WorkspaceResponse>('/v1/workspace'),
    enabled: activeId !== null,
  });

  // Removed from this workspace meanwhile: reload the list; the active choice then falls back
  // to a workspace that is still mine (it is derived from the list above).
  useEffect(() => {
    if (current.error instanceof ApiError && current.error.code === 'WORKSPACE_NOT_MEMBER') {
      void queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
    }
  }, [current.error, queryClient]);

  const switchTo = useCallback(
    (id: string) => {
      if (id === activeId) return;
      session.setWorkspace(id);
      setChosenId(id);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== WORKSPACES_KEY[0] });
      void api('/v1/me/last-workspace', {
        method: 'PUT',
        body: { workspaceId: id },
        workspace: false,
      }).catch(() => undefined);
    },
    [activeId, queryClient],
  );

  const createMutation = useMutation({
    mutationFn: (input: CreateWorkspaceRequest) =>
      api<WorkspaceSummary>('/v1/workspaces', { method: 'POST', body: input, workspace: false }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY });
      switchTo(created.id);
    },
  });

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      active: workspaces.find((w) => w.id === activeId) ?? null,
      current: current.data,
      listStatus: list.status,
      retry: () => void list.refetch(),
      switchTo,
      create: createMutation.mutateAsync,
    }),
    [workspaces, activeId, current.data, list, switchTo, createMutation.mutateAsync],
  );
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = use(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return value;
}

/** Whether my role in the active workspace has `permission`. The API still decides (rule 3). */
export function useCan(permission: Permission): boolean {
  return useWorkspace().current?.permissions.includes(permission) ?? false;
}

/** Renders children only when the member may do this; otherwise `fallback` (or nothing). */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}
