import type {
  CreateProjectInput,
  ProjectSummary
} from '@shared/domain/project';

const ensureBridge = () => {
  if (!window.appBridge) {
    console.warn('[Renderer] App bridge is not available. Running in browser mode?');
    throw new Error('App bridge is not available. Are you running inside Electron?');
  }

  return window.appBridge;
};

export const ProjectService = {
  async list(): Promise<ProjectSummary[]> {
    try {
      if (!window.appBridge?.listProjects) {
        console.warn('[ProjectService] Running in browser mode, returning empty project list');
        return [];
      }
      const bridge = ensureBridge();
      if (!bridge.listProjects) {
        return [];
      }
      return await bridge.listProjects();
    } catch (error) {
      console.error('[Renderer] Failed to list projects', error);
      throw error;
    }
  },

  async create(input: CreateProjectInput): Promise<ProjectSummary> {
    if (!window.appBridge?.createProject) {
      console.warn('[ProjectService] Running in browser mode, createProject not available');
      throw new Error('Create project API is not available. Are you running inside Electron?');
    }
    const bridge = ensureBridge();
    if (!bridge.createProject) {
      throw new Error('Create project API is not available.');
    }
    const project = await bridge.createProject(input);
    await ProjectService.setActive(project.id);
    return project;
  },

  async get(projectId: string): Promise<ProjectSummary | null> {
    if (!window.appBridge?.getProject) {
      return null;
    }
    const bridge = ensureBridge();
    if (!bridge.getProject) {
      throw new Error('Get project API is not available.');
    }
    return bridge.getProject(projectId);
  },

  async getActiveId(): Promise<string | null> {
    if (!window.appBridge?.getActiveProjectId) {
      return null;
    }
    const bridge = ensureBridge();
    if (!bridge.getActiveProjectId) {
      return null;
    }
    return bridge.getActiveProjectId();
  },

  async setActive(projectId: string | null): Promise<void> {
    if (!window.appBridge?.setActiveProjectId) {
      return;
    }
    const bridge = ensureBridge();
    if (!bridge.setActiveProjectId) {
      return;
    }
    await bridge.setActiveProjectId(projectId);
  }
};
