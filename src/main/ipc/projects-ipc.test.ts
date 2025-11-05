import { registerProjectIpc } from './projects-ipc';
import type { PersistenceAdapter } from '../persistence/persistence-adapter';
import type { CreateProjectInput } from '@shared/domain/project';

// Mock Electron module
vi.mock('../electron-module', async () => {
  const actual = await import('../electron-module');
  return {
    ...actual,
    ipcMain: {
      handle: vi.fn()
    }
  };
});

describe('ProjectIPC', () => {
  let mockPersistence: PersistenceAdapter;
  let mockIpcMain: any;
  let handlers: Map<string, any>;

  beforeEach(() => {
    handlers = new Map();
    mockIpcMain = {
      handle: vi.fn((channel: string, handler: any) => {
        handlers.set(channel, handler);
      })
    };

    vi.mocked(mockIpcMain.handle).mockClear();

    mockPersistence = {
      listProjects: vi.fn(),
      createProject: vi.fn(),
      getProjectById: vi.fn(),
      getActiveProjectId: vi.fn(),
      setActiveProjectId: vi.fn(),
      listDatasets: vi.fn(),
      getDatasetById: vi.fn(),
      createDataset: vi.fn(),
      deleteDataset: vi.fn(),
      updateDatasetDisplayName: vi.fn(),
      updateDatasetFeatureStates: vi.fn(),
      updateDatasetPlotTracks: vi.fn(),
      updateDatasetLinkTracks: vi.fn()
    } as unknown as PersistenceAdapter;

    registerProjectIpc(mockPersistence);
  });

  describe('LIST_PROJECTS', () => {
    it('应成功列出项目', async () => {
      const mockProjects = [
        {
          id: 'project1',
          name: 'Test Project 1',
          description: 'Test description',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'project2',
          name: 'Test Project 2',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      ];

      mockPersistence.listProjects = vi.fn().mockResolvedValue(mockProjects);

      const handler = handlers.get('projects:list');
      const result = await handler();

      expect(result).toEqual({
        ok: true,
        data: mockProjects
      });

      expect(mockPersistence.listProjects).toHaveBeenCalled();
    });

    it('应在列表项目时处理错误', async () => {
      mockPersistence.listProjects = vi.fn().mockRejectedValue(new Error('Database error'));

      const handler = handlers.get('projects:list');
      const result = await handler();

      expect(result).toEqual({
        ok: false,
        error: 'Database error'
      });
    });
  });

  describe('CREATE_PROJECT', () => {
    it('应成功创建项目', async () => {
      const input: CreateProjectInput = {
        name: 'New Project',
        description: 'Test description'
      };

      const mockProject = {
        id: 'new-project-id',
        name: 'New Project',
        description: 'Test description',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockPersistence.createProject = vi.fn().mockResolvedValue(mockProject);

      const handler = handlers.get('projects:create');
      const result = await handler(null, input);

      expect(result).toEqual({
        ok: true,
        data: mockProject
      });

      expect(mockPersistence.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'Test description'
      });
    });

    it('应拒绝空名称', async () => {
      const input: CreateProjectInput = {
        name: ''
      };

      const handler = handlers.get('projects:create');
      const result = await handler(null, input);

      expect(result).toEqual({
        ok: false,
        error: 'Project name is required.'
      });

      expect(mockPersistence.createProject).not.toHaveBeenCalled();
    });

    it('应处理创建错误', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project'
      };

      mockPersistence.createProject = vi.fn().mockRejectedValue(new Error('Failed to create'));

      const handler = handlers.get('projects:create');
      const result = await handler(null, input);

      expect(result).toEqual({
        ok: false,
        error: 'Failed to create'
      });
    });
  });

  describe('GET_PROJECT', () => {
    it('应成功获取项目', async () => {
      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockPersistence.getProjectById = vi.fn().mockResolvedValue(mockProject);

      const handler = handlers.get('projects:get');
      const result = await handler(null, 'project1');

      expect(result).toEqual({
        ok: true,
        data: mockProject
      });

      expect(mockPersistence.getProjectById).toHaveBeenCalledWith('project1');
    });

    it('应在项目不存在时返回错误', async () => {
      mockPersistence.getProjectById = vi.fn().mockResolvedValue(null);

      const handler = handlers.get('projects:get');
      const result = await handler(null, 'nonexistent');

      expect(result).toEqual({
        ok: false,
        error: 'Project not found.'
      });
    });

    it('应在缺少项目ID时返回错误', async () => {
      const handler = handlers.get('projects:get');
      const result = await handler(null, '');

      expect(result).toEqual({
        ok: false,
        error: 'Project id is required.'
      });
    });
  });

  describe('GET_ACTIVE_PROJECT', () => {
    it('应成功获取激活项目ID', async () => {
      const activeId = 'active-project-id';
      mockPersistence.getActiveProjectId = vi.fn().mockResolvedValue(activeId);

      const handler = handlers.get('projects:getActive');
      const result = await handler();

      expect(result).toEqual({
        ok: true,
        data: activeId
      });

      expect(mockPersistence.getActiveProjectId).toHaveBeenCalled();
    });

    it('应处理获取激活项目的错误', async () => {
      mockPersistence.getActiveProjectId = vi.fn().mockRejectedValue(new Error('Failed'));

      const handler = handlers.get('projects:getActive');
      const result = await handler();

      expect(result).toEqual({
        ok: false,
        error: 'Failed'
      });
    });
  });

  describe('SET_ACTIVE_PROJECT', () => {
    it('应成功设置激活项目', async () => {
      mockPersistence.setActiveProjectId = vi.fn().mockResolvedValue(undefined);

      const handler = handlers.get('projects:setActive');
      const result = await handler(null, 'project1');

      expect(result).toEqual({
        ok: true,
        data: null
      });

      expect(mockPersistence.setActiveProjectId).toHaveBeenCalledWith('project1');
    });

    it('应成功清除激活项目', async () => {
      mockPersistence.setActiveProjectId = vi.fn().mockResolvedValue(undefined);

      const handler = handlers.get('projects:setActive');
      const result = await handler(null, null);

      expect(result).toEqual({
        ok: true,
        data: null
      });

      expect(mockPersistence.setActiveProjectId).toHaveBeenCalledWith(null);
    });

    it('应处理设置激活项目的错误', async () => {
      mockPersistence.setActiveProjectId = vi.fn().mockRejectedValue(new Error('Failed'));

      const handler = handlers.get('projects:setActive');
      const result = await handler(null, 'project1');

      expect(result).toEqual({
        ok: false,
        error: 'Failed'
      });
    });
  });
});
