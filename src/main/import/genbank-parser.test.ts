import { GenBankAnnotationParser } from './genbank-parser';
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

describe('GenBankAnnotationParser', () => {
  let parser: GenBankAnnotationParser;
  let mockReadFileSync: any;
  let mockRandomUUID: any;
  const mockProjectId = 'test-project-id';

  beforeEach(async () => {
    parser = new GenBankAnnotationParser();
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
      expect(summary).toMatchObject({
        format: 'genbank',
        displayName: 'GenBank 注释解析器'
      });
      expect(summary.description).toContain('读取 GenBank');
    });
  });

  describe('canParse', () => {
    it('应正确识别 genbank 格式', () => {
      expect(parser.canParse('genbank')).toBe(true);
      expect(parser.canParse('json')).toBe(false);
      expect(parser.canParse('gff3')).toBe(false);
      expect(parser.canParse('csv')).toBe(false);
    });
  });

  describe('parse', () => {
    it('应解析包含 LOCUS 的 GenBank 文件', async () => {
      const genbankData = `LOCUS       NC_000001              1000 bp    DNA     linear   CON 01-JAN-1988
DEFINITION  Escherichia coli K-12 gene for hypothetical protein.
ACCESSION   NC_000001
FEATURES             Location/Qualifiers
     gene            100..200
                     /gene="geneA"
     CDS             300..500
                     /product="hypothetical protein"
ORIGIN
        1 aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa
//

`;

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset).toMatchObject({
        projectId: mockProjectId,
        format: 'genbank',
        sourcePath: 'test.gb',
        meta: {
          recordCount: 2,
          organism: 'Escherichia coli K-12',
          totalLength: 1000
        }
      });

      expect(result.dataset.features).toHaveLength(2);
      expect(result.dataset.features[0]).toMatchObject({
        type: 'gene',
        name: 'geneA',
        start: 100,
        stop: 200
      });
    });

    it('应从不同格式的基因位置解析', async () => {
      const genbankData = `LOCUS       TEST                  500 bp     DNA
FEATURES             Location/Qualifiers
     gene            complement(100..200)
     CDS             300..<500
     rRNA            join(50,100,150)

ORIGIN
//

`;

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features).toHaveLength(3);
    });

    it('应处理空 GenBank 文件', async () => {
      const genbankData = '';

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'empty.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features).toHaveLength(0);
      expect(result.dataset.meta.recordCount).toBe(0);
    });

    it('应处理无 FEATURES 的 GenBank 文件', async () => {
      const genbankData = `LOCUS       TEST                  500 bp     DNA
DEFINITION  Test sequence.
ACCESSION   TEST001
ORIGIN
//

`;

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features).toHaveLength(0);
    });

    it('应提取多种类型的特征', async () => {
      const genbankData = `LOCUS       TEST                  1000 bp    DNA
FEATURES             Location/Qualifiers
     gene            100..200
                     /gene="geneA"
     CDS             300..500
                     /product="protein A"
     rRNA            600..700
                     /product="16S rRNA"
     tRNA            800..850
                     /product="tRNA-Met"

ORIGIN
//

`;

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features).toHaveLength(4);
      expect(result.dataset.features[0].type).toBe('gene');
      expect(result.dataset.features[1].type).toBe('CDS');
      expect(result.dataset.features[2].type).toBe('rRNA');
      expect(result.dataset.features[3].type).toBe('tRNA');
    });

    it('应推断 totalLength', async () => {
      const genbankData = `LOCUS       TEST                  500 bp     DNA
FEATURES             Location/Qualifiers
     gene            100..200

ORIGIN
//

`;

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset.meta.totalLength).toBe(500);
    });

    it('应处理链方向（complement）', async () => {
      const genbankData = `LOCUS       TEST                  500 bp     DNA
FEATURES             Location/Qualifiers
     gene            complement(100..200)
                     /gene="geneA"

ORIGIN
//

`;

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features[0]).toMatchObject({
        strand: -1
      });
    });

    it('应保存 qualifiers', async () => {
      const genbankData = `LOCUS       TEST                  500 bp     DNA
FEATURES             Location/Qualifiers
     CDS             100..200
                     /product="hypothetical protein"
                     /note="important"

ORIGIN
//

`;

      mockReadFileSync.mockReturnValueOnce(genbankData);

      const request: FileParseRequest = {
        projectId: mockProjectId,
        filePath: 'test.gb'
      };

      const result = await parser.parse(request);

      expect(result.dataset.features[0].qualifiers).toMatchObject({
        product: 'hypothetical protein',
        note: 'important'
      });
    });
  });
});
