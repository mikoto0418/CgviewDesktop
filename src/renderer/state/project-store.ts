import { create } from "zustand";
import type { CreateProjectInput, ProjectSummary } from "@shared/domain/project";
import { ProjectService } from "@renderer/services/project-service";

type WorkspaceView = 'dashboard' | 'workspace';

export interface ProjectStoreState {
  projects: ProjectSummary[];
  selectedId: string | null;
  loading: boolean;
  isCreating: boolean;
  view: WorkspaceView;
  loadProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<ProjectSummary>;
  selectProject: (projectId: string | null) => void;
  openProject: (projectId: string) => Promise<void>;
  exitWorkspace: () => void;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  selectedId: null,
  loading: false,
  isCreating: false,
  view: 'dashboard',
  loadProjects: async () => {
    if (!window.appBridge?.listProjects) {
      set({ projects: [], selectedId: null, loading: false, view: 'dashboard' });
      return;
    }

    set({ loading: true });
    try {
      const [list, activeId] = await Promise.all([
        ProjectService.list(),
        ProjectService.getActiveId()
      ]);

      let selectedId: string | null = null;
      let view: WorkspaceView = 'dashboard';
      if (list.length > 0) {
        const match = activeId && list.find((item) => item.id === activeId);
        selectedId = match ? match.id : list[0].id;

        if (!match && selectedId) {
          await ProjectService.setActive(selectedId);
        }

        if (activeId && match) {
          view = 'workspace';
        }
      }

      set({
        projects: list,
        selectedId,
        view
      });
    } finally {
      set({ loading: false });
    }
  },
  createProject: async (input) => {
    set({ isCreating: true });
    try {
      const project = await ProjectService.create(input);
      const projects = [project, ...get().projects];
      set({ projects, selectedId: project.id, view: 'workspace' });
      return project;
    } finally {
      set({ isCreating: false });
    }
  },
  selectProject: (projectId) => {
    set({ selectedId: projectId, view: 'dashboard' });
    ProjectService.setActive(projectId).catch((error) => {
      console.error('[ProjectStore] Failed to set active project', error);
    });
  },
  openProject: async (projectId) => {
    await ProjectService.setActive(projectId);
    set({ selectedId: projectId, view: 'workspace' });
  },
  exitWorkspace: () => {
    set({ view: 'dashboard' });
  }
}));
