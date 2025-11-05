import { JsonAnnotationParser } from './json-parser';
import type { FileParseRequest } from '@shared/parser/types';

// Mock node:fs - 为 CommonJS 模块添加 default export
vi.mock('node:fs', async () => {
  const actual = await import('node:fs');
  return {
    default: {
      ...actual,
      readFileSync: vi.fn()
    }
  };
});

// Mock node:crypto
vi.mock('node:crypto', async () => {
  const actual = await import('node:crypto');
  return {
    default: {
      ...actual,
      randomUUID: vi.fn(() => 'test-uuid-1234-5678-9abc-def0')
    }
  };
});

describe('JsonAnnotationParser', () => {
  let parser: JsonAnnotationParser;
  let mockReadFileSync: any;
  let mockRandomUUID: any;
  const mockProjectId = 'test-project-id';

  beforeEach(async () => {
    parser = new JsonAnnotationParser();
    vi.clearAllMocks();

    const fsModule = await import('node:fs');
    const cryptoModule = await import('node:crypto');
    mockReadFileSync = vi.mocked(fsModule.default.readFileSync);
    mockRandomUUID = vi.mocked(cryptoModule.default.randomUUID);
    mockRandomUUID.mockReturnValue('test-uuid-1234-5678-9abc-def0');
  });

  describe('summary', () => {
    it('应返回正确的解析器摘要', () => {
      const summary = parser.summary();
      expect(summary).toEqual({
        format: 'json',
        displayName: 'JSON Annotation Parser',
        description: '读取结构化 JSON 注释文件并转换为标准特征列表'
      });
    });
  });

  describe('canParse', () => {
    it('应正确识别 json 格式', () => {
      expect(parser.canParse('json')).toBe(true);
      expect(parser.canParse('csv')).toBe(false);
    });
  });

  describe('parse', () => {
    it('应正确解析包含元数据的 JSON 文件', async () => {
      const testData = {
        meta: {
          recordCount: 4,
          totalLength: 12000,
          organism: 'Test organism'
        },
        features: [
          { name: 'gene1', type: 'gene', start: 100, stop: 200, strand: 1 }
        ]
      };

      const { readFileSync } = await import('node:fs');
      vi.mocked(readFileSync).mockReturnValueOnce(JSON.stringify(testData));

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.json'
      };

      const result = await parser.parse(request);

      expect(result.dataset).toMatchObject({
        projectId: mockProjectId,
        format: 'json',
        sourcePath: 'test.json'
      });
      expect(result.dataset.id).toBeDefined();
    });
  });
});
