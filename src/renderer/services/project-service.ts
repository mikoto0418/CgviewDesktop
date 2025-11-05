import type {
  CreateProjectInput,
  ProjectSummary
} from '@shared/domain/project';

const ensureBridge = () => {
  if (!window.appBridge) {
    throw new Error('App bridge is not available. Are you running inside Electron?');
  }

  return window.appBridge;
};

export const ProjectService = {
  async list(): Promise<ProjectSummary[]> {
    try {
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
    const bridge = ensureBridge();
    if (!bridge.createProject) {
      throw new Error('Create project API is not available.');
    }
    const project = await bridge.createProject(input);
    await ProjectService.setActive(project.id);
    return project;
  },

  async get(projectId: string): Promise<ProjectSummary | null> {
    const bridge = ensureBridge();
    if (!bridge.getProject) {
      throw new Error('Get project API is not available.');
    }
    return bridge.getProject(projectId);
  },

  async getActiveId(): Promise<string | null> {
    const bridge = ensureBridge();
    if (!bridge.getActiveProjectId) {
      return null;
    }
    return bridge.getActiveProjectId();
  },

  async setActive(projectId: string | null): Promise<void> {
    const bridge = ensureBridge();
    if (!bridge.setActiveProjectId) {
      return;
    }
    await bridge.setActiveProjectId(projectId);
  }
};
