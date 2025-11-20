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
  updateProject: (projectId: string, name: string, description?: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
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
      // 在开发模式下，如果没有appBridge，创建模拟项目
      if (!window.appBridge?.createProject) {
        console.warn('[ProjectStore] Running in browser mode, creating mock project');
        const mockProject: ProjectSummary = {
          id: `mock-${Date.now()}`,
          name: input.name,
          description: input.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const projects = [mockProject, ...get().projects];
        set({ projects, selectedId: mockProject.id, view: 'dashboard' });
        return mockProject;
      }

      const project = await ProjectService.create(input);
      const projects = [project, ...get().projects];
      set({ projects, selectedId: project.id, view: 'workspace' });
      return project;
    } finally {
      set({ isCreating: false });
    }
  },
  updateProject: async (projectId, name, description) => {
    try {
      if (!window.appBridge?.updateProject) {
        console.warn('[ProjectStore] Running in browser mode, updateProject not available');
        return;
      }

      const updatedProject = await ProjectService.update(projectId, {
        name,
        description
      });

      // 更新本地项目列表
      const projects = get().projects.map(p => 
        p.id === projectId ? updatedProject : p
      );
      
      set({ projects });
    } catch (error) {
      console.error('[ProjectStore] Failed to update project', error);
      throw error;
    }
  },
  deleteProject: async (projectId) => {
    try {
      if (!window.appBridge?.deleteProject) {
        console.warn('[ProjectStore] Running in browser mode, deleteProject not available');
        return;
      }

      await ProjectService.delete(projectId);

      // 从列表中移除项目
      const projects = get().projects.filter(p => p.id !== projectId);
      
      // 如果删除的是当前选中的项目，选择第一个可用项目
      let selectedId = get().selectedId;
      if (selectedId === projectId) {
        selectedId = projects.length > 0 ? projects[0].id : null;
        
        // 如果在工作区视图，返回到仪表板
        if (get().view === 'workspace') {
          set({ projects, selectedId, view: 'dashboard' });
          return;
        }
      }
      
      set({ projects, selectedId });
    } catch (error) {
      console.error('[ProjectStore] Failed to delete project', error);
      throw error;
    }
  },
  selectProject: (projectId) => {
    set({ selectedId: projectId, view: 'dashboard' });
    ProjectService.setActive(projectId).catch((error) => {
      console.error('[ProjectStore] Failed to set active project', error);
    });
  },
  openProject: async (projectId) => {
    // 在开发模式下，如果没有appBridge，直接切换到工作区
    if (!window.appBridge?.setActiveProjectId) {
      console.warn('[ProjectStore] Running in browser mode, switching to workspace without backend');
      set({ selectedId: projectId, view: 'workspace' });
      return;
    }

    await ProjectService.setActive(projectId);
    set({ selectedId: projectId, view: 'workspace' });
  },
  exitWorkspace: () => {
    set({ view: 'dashboard' });
  }
}));
