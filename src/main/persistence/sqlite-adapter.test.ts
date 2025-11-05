import { SQLitePersistenceAdapter } from './sqlite-adapter';

// Mock sql.js
vi.mock('sql.js', async () => {
  const mockDatabase = {
    exec: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
    get: vi.fn(),
    close: vi.fn()
  };

  const mockSql = {
    Database: vi.fn(() => mockDatabase)
  };

  return {
    default: mockSql,
    initSqlJs: vi.fn().mockResolvedValue(mockSql)
  };
});

// Mock node:fs
vi.mock('node:fs', async () => {
  const actual = await import('node:fs');
  return {
    default: actual,
    ...actual,
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from([]))
  };
});

// Mock node:path
vi.mock('node:path', async () => {
  const actual = await import('node:path');
  return {
    default: actual,
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
    resolve: vi.fn((...args) => args.join('/'))
  };
});

// Mock node:crypto
vi.mock('node:crypto', async () => {
  const actual = await import('node:crypto');
  return {
    default: actual,
    ...actual,
    randomUUID: vi.fn(() => 'mock-uuid')
  };
});

describe('SQLitePersistenceAdapter', () => {
  let adapter: SQLitePersistenceAdapter;
  let mockSql: any;
  let mockDatabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDatabase = {
      exec: vi.fn(),
      run: vi.fn(),
      all: vi.fn(),
      get: vi.fn(),
      close: vi.fn()
    };

    mockSql = {
      Database: vi.fn(() => mockDatabase)
    };

    // Use vi.mocked() helper to access the mocked module
    const sqlModule = await vi.importMock<typeof import('sql.js')>('sql.js');
    sqlModule.initSqlJs.mockResolvedValue(mockSql);

    adapter = new SQLitePersistenceAdapter({ databaseFile: ':memory:' });
    await adapter.init();
  });

  describe('构造函数', () => {
    it('应创建数据库连接', () => {
      expect(mockSql.Database).toHaveBeenCalled();
    });
  });

  describe('executeMigration', () => {
    it('应执行迁移语句', async () => {
      const migration = {
        id: 'test-migration',
        statements: ['CREATE TABLE test (id TEXT)']
      };

      await adapter.executeMigration(migration as any);

      expect(mockDatabase.exec).toHaveBeenCalledWith('CREATE TABLE test (id TEXT)');
    });

    it('应记录已应用的迁移', async () => {
      const migration = {
        id: 'test-migration',
        statements: ['CREATE TABLE test (id TEXT)']
      };

      await adapter.executeMigration(migration as any);

      expect(mockDatabase.run).toHaveBeenCalledWith(
        'INSERT INTO __migrations (id) VALUES (?)',
        ['test-migration']
      );
    });

    it('应跳过已应用的迁移', async () => {
      mockDatabase.all = vi.fn().mockReturnValue([{ id: 'existing-migration' }]);

      const migration = {
        id: 'existing-migration',
        statements: ['CREATE TABLE test (id TEXT)']
      };

      await adapter.executeMigration(migration as any);

      expect(mockDatabase.exec).not.toHaveBeenCalled();
    });
  });

  describe('createProject', () => {
    beforeEach(() => {
      mockDatabase.run.mockReturnValue({ changes: 1 });
    });

    it('应创建项目', async () => {
      const project = await adapter.createProject({
        name: 'Test Project',
        description: 'Test description'
      });

      expect(project).toMatchObject({
        name: 'Test Project',
        description: 'Test description'
      });
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        expect.any(Array)
      );
    });

    it('应使用默认描述', async () => {
      await adapter.createProject({
        name: 'Test Project'
      });

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        expect.arrayContaining(['Test Project', null])
      );
    });
  });

  describe('listProjects', () => {
    it('应列出所有项目', async () => {
      const mockProjects = [
        {
          id: 'project1',
          name: 'Project 1',
          description: 'Description 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockDatabase.all = vi.fn().mockReturnValue(mockProjects);

      const projects = await adapter.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        id: 'project1',
        name: 'Project 1'
      });

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
    });
  });

  describe('getProjectById', () => {
    it('应根据ID获取项目', async () => {
      const mockProject = {
        id: 'project1',
        name: 'Test Project',
        description: 'Test description',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockDatabase.get = vi.fn().mockReturnValue(mockProject);

      const project = await adapter.getProjectById('project1');

      expect(project).toMatchObject({
        id: 'project1',
        name: 'Test Project'
      });

      expect(mockDatabase.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['project1']
      );
    });

    it('应在项目不存在时返回null', async () => {
      mockDatabase.get = vi.fn().mockReturnValue(null);

      const project = await adapter.getProjectById('nonexistent');

      expect(project).toBeNull();
    });
  });

  describe('createDataset', () => {
    it('应创建数据集', async () => {
      const dataset = await adapter.createDataset({
        id: 'dataset1',
        projectId: 'project1',
        format: 'json',
        sourcePath: '/path/to/file',
        meta: { recordCount: 10 },
        features: [{ name: 'feature1' }],
        featureStates: {},
        plotTracks: [],
        linkTracks: [],
        statistics: {
          totalFeatures: 10,
          featureTypes: []
        },
        createdAt: '2024-01-01T00:00:00Z'
      });

      expect(dataset.id).toBe('dataset1');
      expect(dataset.projectId).toBe('project1');

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO datasets'),
        expect.any(Array)
      );
    });

    it('应保存features', async () => {
      const features = [{ name: 'feature1' }, { name: 'feature2' }];

      await adapter.createDataset({
        id: 'dataset1',
        projectId: 'project1',
        format: 'json',
        sourcePath: '/path/to/file',
        meta: { recordCount: 2 },
        features,
        featureStates: {},
        plotTracks: [],
        linkTracks: [],
        statistics: { totalFeatures: 2, featureTypes: [] },
        createdAt: '2024-01-01T00:00:00Z'
      });

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dataset_features'),
        expect.arrayContaining(['dataset1', 0, JSON.stringify(features[0])])
      );
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dataset_features'),
        expect.arrayContaining(['dataset1', 1, JSON.stringify(features[1])])
      );
    });
  });

  describe('listDatasets', () => {
    it('应列出项目的数据集', async () => {
      const mockDatasets = [
        {
          id: 'dataset1',
          project_id: 'project1',
          file_name: 'file.json',
          file_type: 'json',
          status: 'complete',
          metadata_json: JSON.stringify({ recordCount: 10 }),
          imported_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockDatabase.all = vi.fn().mockReturnValue(mockDatasets);

      const datasets = await adapter.listDatasets('project1');

      expect(datasets).toHaveLength(1);
      expect(datasets[0]).toMatchObject({
        id: 'dataset1',
        format: 'json'
      });

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['project1']
      );
    });
  });

  describe('deleteDataset', () => {
    it('应删除数据集', async () => {
      mockDatabase.run.mockReturnValue({ changes: 1 });

      await adapter.deleteDataset('dataset1');

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM datasets'),
        ['dataset1']
      );
    });

    it('应删除关联的features', async () => {
      await adapter.deleteDataset('dataset1');

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dataset_features'),
        ['dataset1']
      );
    });
  });

  describe('getActiveProjectId / setActiveProjectId', () => {
    it('应保存和获取激活项目ID', async () => {
      mockDatabase.get = vi.fn().mockReturnValue({ value: 'project1' });

      await adapter.setActiveProjectId('project1');

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        expect.arrayContaining(['active_project_id', 'project1'])
      );

      mockDatabase.get = vi.fn().mockReturnValue({ value: 'project1' });

      const activeId = await adapter.getActiveProjectId();

      expect(activeId).toBe('project1');
    });

    it('应返回null当没有激活项目', async () => {
      mockDatabase.get = vi.fn().mockReturnValue(null);

      const activeId = await adapter.getActiveProjectId();

      expect(activeId).toBeNull();
    });
  });

  describe('close', () => {
    it('应关闭数据库连接', async () => {
      await adapter.close();

      expect(mockDatabase.close).toHaveBeenCalled();
    });
  });
});
