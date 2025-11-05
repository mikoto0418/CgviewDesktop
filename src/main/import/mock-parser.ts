import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import type {
  AnnotationParser,
  FileParseRequest,
  FileParseResult,
  ParserSummary
} from '@shared/parser/types';

export class MockParser implements AnnotationParser {
  summary(): ParserSummary {
    return {
      format: 'genbank',
      displayName: 'Mock Parser',
      description: '返回示例数据的占位解析器，用于联调管线'
    };
  }

  canParse(): boolean {
    return true;
  }

  async parse(request: FileParseRequest): Promise<FileParseResult> {
    const now = new Date().toISOString();
    return {
      dataset: {
        id: randomUUID(),
        projectId: request.projectId,
        format: request.formatHint ?? 'genbank',
        sourcePath: request.filePath,
        meta: {
          recordCount: 1,
          totalLength: 10000,
          organism: basename(request.filePath) || 'Mock Organism'
        },
        features: [
          {
            id: randomUUID(),
            type: 'gene',
            name: 'mockA',
            start: 100,
            end: 1200,
            createdAt: now
          }
        ]
      },
      warnings: ['当前为模拟解析结果，用于测试和调试']
    };
  }
}
