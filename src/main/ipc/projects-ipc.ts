import type { CreateProjectInput } from '@shared/domain/project';
import type { PersistenceAdapter } from '../persistence/persistence-adapter';
import { ipcMain } from '../electron-module';

const CHANNELS = {
  LIST_PROJECTS: 'projects:list',
  CREATE_PROJECT: 'projects:create',
  GET_PROJECT: 'projects:get',
  GET_ACTIVE_PROJECT: 'projects:getActive',
  SET_ACTIVE_PROJECT: 'projects:setActive'
} as const;

export const registerProjectIpc = (persistence: PersistenceAdapter) => {
  ipcMain.handle(CHANNELS.LIST_PROJECTS, async () => {
    try {
      const result = await persistence.listProjects();
      return { ok: true as const, data: result };
    } catch (error) {
      console.error('[IPC] Failed to list projects', error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while listing projects.'
      };
    }
  });

  ipcMain.handle(
    CHANNELS.CREATE_PROJECT,
    async (_event, payload: CreateProjectInput) => {
      try {
        if (!payload?.name?.trim()) {
          throw new Error('Project name is required.');
        }

        const project = await persistence.createProject({
          name: payload.name.trim(),
          description: payload.description?.trim() || undefined
        });

        return { ok: true as const, data: project };
      } catch (error) {
        console.error('[IPC] Failed to create project', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while creating project.'
        };
      }
    }
  );

  ipcMain.handle(
    CHANNELS.GET_PROJECT,
    async (_event, projectId: string) => {
      try {
        if (!projectId) {
          throw new Error('Project id is required.');
        }
        const project = await persistence.getProjectById(projectId);
        if (!project) {
          return { ok: false as const, error: 'Project not found.' };
        }
        return { ok: true as const, data: project };
      } catch (error) {
        console.error('[IPC] Failed to get project', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while retrieving project.'
        };
      }
    }
  );

  ipcMain.handle(CHANNELS.GET_ACTIVE_PROJECT, async () => {
    try {
      const activeId = await persistence.getActiveProjectId();
      return { ok: true as const, data: activeId };
    } catch (error) {
      console.error('[IPC] Failed to get active project', error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while retrieving active project.'
      };
    }
  });

  ipcMain.handle(
    CHANNELS.SET_ACTIVE_PROJECT,
    async (_event, projectId: string | null) => {
      try {
        await persistence.setActiveProjectId(projectId ?? null);
        return { ok: true as const, data: null };
      } catch (error) {
        console.error('[IPC] Failed to set active project', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while updating active project.'
        };
      }
    }
  );
};

export type ProjectIpcChannels = typeof CHANNELS;
