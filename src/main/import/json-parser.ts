import { readFileSync } from 'node:fs';
import type {
  AnnotationParser,
  FileParseRequest,
  FileParseResult,
  ParsedDatasetMeta,
  ParserSummary
} from '@shared/parser/types';
import { randomUUID } from 'node:crypto';

const parseMeta = (value: unknown): ParsedDatasetMeta => {
  if (!value || typeof value !== 'object') {
    return { recordCount: 0 };
  }

  const meta = value as Record<string, unknown>;
  return {
    recordCount: Number(meta.recordCount ?? meta.featureCount ?? 0),
    totalLength: meta.totalLength ? Number(meta.totalLength) : undefined,
    organism: typeof meta.organism === 'string' ? meta.organism : undefined
  };
};

export class JsonAnnotationParser implements AnnotationParser {
  summary(): ParserSummary {
    return {
      format: 'json',
      displayName: 'JSON Annotation Parser',
      description: '读取结构化 JSON 注释文件并转换为标准特征列表'
    };
  }

  canParse(format: string): boolean {
    return format === 'json';
  }

  async parse(request: FileParseRequest): Promise<FileParseResult> {
    const raw = readFileSync(request.filePath, 'utf8');
    const data = JSON.parse(raw);

    const meta = parseMeta(data.meta ?? data.summary ?? {});
    const features = Array.isArray(data.features) ? data.features : [];

    if (!meta.recordCount) {
      meta.recordCount = features.length;
    }
    if (!meta.totalLength) {
      const inferredLength = Number(data.sequence?.length ?? data.length ?? 0);
      if (Number.isFinite(inferredLength) && inferredLength > 0) {
        meta.totalLength = inferredLength;
      } else {
        const maxStop = features.reduce((max, feature) => {
          const record = feature as Record<string, unknown>;
          const stop = Number(record.stop ?? record.end ?? record.mapStop);
          return Number.isFinite(stop) ? Math.max(max, stop) : max;
        }, 0);
        if (maxStop > 0) {
          meta.totalLength = maxStop;
        }
      }
    }

    return {
      dataset: {
        id: randomUUID(),
        projectId: request.projectId,
        format: 'json',
        sourcePath: request.filePath,
        meta,
        features
      }
    };
  }
}


