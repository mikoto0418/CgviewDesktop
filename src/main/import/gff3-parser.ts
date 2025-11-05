import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type {
  AnnotationParser,
  FileParseRequest,
  FileParseResult,
  ParsedDatasetMeta,
  ParserSummary
} from '@shared/parser/types';

const parseAttributes = (value: string) => {
  const attributes: Record<string, string> = {};

  value
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const [key, raw] = segment.split('=');
      if (!key) {
        return;
      }
      const decoded = raw ? decodeURIComponent(raw) : '';
      attributes[key] = decoded;
    });

  return attributes;
};

const deriveName = (attributes: Record<string, string>, fallback: string) => {
  return (
    attributes.Name ??
    attributes.ID ??
    attributes.gene ??
    attributes.product ??
    fallback
  );
};

const parseMeta = (lines: string[]): ParsedDatasetMeta => {
  const meta: ParsedDatasetMeta = { recordCount: 0 };

  for (const line of lines) {
    if (line.startsWith('##sequence-region')) {
      const [, , start, end] = line.split(/\s+/);
      if (end) {
        const length = Number(end);
        if (Number.isFinite(length) && length > 0) {
          meta.totalLength = length;
        }
      }
    }

    if (!meta.organism && line.startsWith('##species')) {
      const [, species] = line.split(/\s+/);
      if (species) {
        meta.organism = decodeURIComponent(species);
      }
    }

    if (meta.totalLength && meta.organism) {
      break;
    }
  }

  return meta;
};

export class Gff3AnnotationParser implements AnnotationParser {
  summary(): ParserSummary {
    return {
      format: 'gff3',
      displayName: 'GFF3 解析器',
      description: '解析 .gff/.gff3 注释文件并标准化特征数据'
    };
  }

  canParse(format: string): boolean {
    return format === 'gff3';
  }

  async parse(request: FileParseRequest): Promise<FileParseResult> {
    const raw = readFileSync(request.filePath, 'utf8');
    const lines = raw.split(/\r?\n/);

    const meta = parseMeta(lines);
    const warnings: string[] = [];
    const features: Array<Record<string, unknown>> = [];

    let maxEnd = meta.totalLength ?? 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const columns = trimmed.split('\t');
      if (columns.length < 8) {
        warnings.push(
          `第 ${index + 1} 行格式不完整，已跳过 (Line ${index + 1} skipped: expected 8+ columns, got ${columns.length}).`
        );
        return;
      }

      const [
        seqId,
        source,
        type,
        startRaw,
        endRaw,
        scoreRaw,
        strandRaw,
        phaseRaw,
        attributesRaw = ''
      ] = columns;

      const start = Number(startRaw);
      const end = Number(endRaw);

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        warnings.push(
          `第 ${index + 1} 行起止坐标无效，已跳过 (Line ${index + 1} skipped: invalid start/end).`
        );
        return;
      }

      const attributes = parseAttributes(attributesRaw);
      const strand = strandRaw === '-' ? -1 : 1;
      const score = scoreRaw && scoreRaw !== '.' ? Number(scoreRaw) : undefined;
      const phase = phaseRaw && phaseRaw !== '.' ? Number(phaseRaw) : undefined;

      const safeStart = Math.min(start, end);
      const safeEnd = Math.max(start, end);

      maxEnd = Math.max(maxEnd, safeEnd);

      features.push({
        id: attributes.ID ?? randomUUID(),
        seqId,
        source,
        type,
        start: safeStart,
        stop: safeEnd,
        strand,
        score,
        phase,
        name: deriveName(attributes, `${type} ${features.length + 1}`),
        attributes
      });
    });

    if (!meta.totalLength && maxEnd > 0) {
      meta.totalLength = maxEnd;
    }
    meta.recordCount = features.length;

    return {
      dataset: {
        id: randomUUID(),
        projectId: request.projectId,
        format: 'gff3',
        sourcePath: request.filePath,
        meta,
        features
      },
      warnings
    };
  }
}
