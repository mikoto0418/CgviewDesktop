import { CsvAnnotationParser } from './csv-parser';
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

describe('CsvAnnotationParser', () => {
  let parser: CsvAnnotationParser;
  let mockReadFileSync: any;
  let mockRandomUUID: any;
  const mockProjectId = 'test-project-id';

  beforeEach(async () => {
    parser = new CsvAnnotationParser();
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
        format: 'csv',
        displayName: 'CSV 轨迹解析器',
        description: '读取逗号分隔的特征列表（start, stop, name, type, strand, color 等列）'
      });
    });
  });

  describe('canParse', () => {
    it('应正确识别 csv 格式', () => {
      expect(parser.canParse('csv')).toBe(true);
      expect(parser.canParse('json')).toBe(false);
      expect(parser.canParse('gff3')).toBe(false);
      expect(parser.canParse('genbank')).toBe(false);
    });
  });

  describe('parse', () => {
    it('应正确解析有效的 CSV 文件', async () => {
      const csvData = `name,type,start,stop,strand,color
gene1,gene,100,200,1,#ff0000
gene2,gene,300,400,-1,#00ff00`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      const result = await parser.parse(request);

      expect(result.dataset).toMatchObject({
        projectId: mockProjectId,
        format: 'csv',
        sourcePath: 'test.csv',
        meta: {
          recordCount: 2
        },
        features: [
          {
            id: 'test-uuid-1234-5678-9abc-def0',
            type: 'gene',
            name: 'gene1',
            start: 100,
            stop: 200,
            strand: 1,
            color: '#ff0000'
          },
          {
            id: 'test-uuid-1234-5678-9abc-def0',
            type: 'gene',
            name: 'gene2',
            start: 300,
            stop: 400,
            strand: -1,
            color: '#00ff00'
          }
        ]
      });

      expect(result.warnings).toHaveLength(0);
    });

    it('应在缺少必要列时抛出错误', async () => {
      const csvData = `name,type
gene1,gene`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      await expect(parser.parse(request)).rejects.toThrow(
        'CSV 缺少必要列 "start"'
      );
    });

    it('应处理空文件', async () => {
      const csvData = '';

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'empty.csv'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features).toHaveLength(0);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('文件为空')
      );
    });

    it('应生成缺失坐标的警告', async () => {
      const csvData = `name,type,start,stop
gene1,gene,100,200
gene2,gene,,300
gene3,gene,400,`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      const result = await parser.parse(request);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('第 3 行缺少起止坐标')
      );
      expect(result.warnings).toContainEqual(
        expect.stringContaining('第 4 行缺少起止坐标')
      );
    });

    it('应使用 start/end 列名作为起止坐标', async () => {
      const csvData = `name,type,begin,end
gene1,gene,100,200`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features).toHaveLength(1);
      expect(result.dataset.features[0]).toMatchObject({
        start: 100,
        stop: 200
      });
    });

    it('应推断 totalLength', async () => {
      const csvData = `name,start,stop
gene1,100,200
gene2,500,800`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      const result = await parser.parse(request);

      expect(result.dataset.meta.totalLength).toBe(800);
    });

    it('应正确处理链方向值', async () => {
      const csvData = `name,start,stop,strand
gene1,100,200,forward
gene2,300,400,-1
gene3,500,600,+`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features[0].strand).toBe(1);
      expect(result.dataset.features[1].strand).toBe(-1);
      expect(result.dataset.features[2].strand).toBe(1);
    });

    it('应提取元数据（organism）', async () => {
      const csvData = `name,start,stop,organism
gene1,100,200,E.coli
gene2,300,400,E.coli`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      const result = await parser.parse(request);

      expect(result.dataset.meta.organism).toBe('E.coli');
    });

    it('应保存额外的列作为 qualifiers', async () => {
      const csvData = `name,start,stop,gene,product,note
gene1,100,200,abcA,hypothetical protein,important`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features[0].qualifiers).toMatchObject({
        gene: 'abcA',
        product: 'hypothetical protein',
        note: 'important'
      });
    });

    it('应处理 CSV 解析错误', async () => {
      const csvData = `name,start,stop
gene1,100`;

      mockReadFileSync.mockReturnValueOnce(csvData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.csv'
      };

      await expect(parser.parse(request)).rejects.toThrow();
    });
  });
});
