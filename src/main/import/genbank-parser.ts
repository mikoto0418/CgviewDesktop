import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type {
  AnnotationParser,
  FileParseRequest,
  FileParseResult,
  ParsedDatasetMeta,
  ParserSummary
} from '@shared/parser/types';

type ParsedLocation = {
  start: number;
  stop: number;
  strand: number;
  segments: Array<{ start: number; end: number }>;
};

const FEATURE_LINE = /^\s{5}([A-Za-z0-9_.-]+)\s+(.+)$/;

const splitLines = (content: string) => content.split(/\r?\n/);

const parseMeta = (lines: string[]): ParsedDatasetMeta => {
  const meta: ParsedDatasetMeta = { recordCount: 0 };

  for (const line of lines) {
    if (!meta.totalLength && line.startsWith('LOCUS')) {
      const match = line.match(/^LOCUS\s+\S+\s+(\d+)/i);
      if (match) {
        const length = Number(match[1]);
        if (Number.isFinite(length) && length > 0) {
          meta.totalLength = length;
        }
      }
    }

    if (!meta.organism) {
      const organismMatch = line.match(/^\s+ORGANISM\s+(.+)/);
      if (organismMatch) {
        meta.organism = organismMatch[1].trim();
      }
    }

    if (meta.totalLength && meta.organism) {
      break;
    }
  }

  return meta;
};

const parseLocation = (raw: string): ParsedLocation | null => {
  const cleaned = raw.replace(/\s+/g, '');
  const numberMatches = Array.from(cleaned.matchAll(/\d+/g)).map((match) => Number(match[0]));

  if (numberMatches.length === 0) {
    return null;
  }

  const start = Math.min(...numberMatches);
  const stop = Math.max(...numberMatches);
  const strand = cleaned.includes('complement') ? -1 : 1;

  const segments: Array<{ start: number; end: number }> = [];
  const segmentMatches = cleaned.matchAll(/(\d+)\.\.(\d+)/g);
  for (const match of segmentMatches) {
    const segmentStart = Number(match[1]);
    const segmentEnd = Number(match[2]);
    if (Number.isFinite(segmentStart) && Number.isFinite(segmentEnd)) {
      segments.push({
        start: Math.min(segmentStart, segmentEnd),
        end: Math.max(segmentStart, segmentEnd)
      });
    }
  }

  if (segments.length === 0) {
    segments.push({ start, end: stop });
  }

  return { start, stop, strand, segments };
};

const parseQualifier = (lines: string[], index: number) => {
  const trimmed = lines[index]?.trim();
  if (!trimmed || !trimmed.startsWith('/')) {
    return { nextIndex: index };
  }

  const body = trimmed.slice(1);
  const equalsIndex = body.indexOf('=');

  if (equalsIndex === -1) {
    return {
      key: body.trim(),
      value: true,
      nextIndex: index
    };
  }

  const key = body.slice(0, equalsIndex).trim();
  let rawValue = body.slice(equalsIndex + 1).trim();
  let nextIndex = index;

  if (rawValue.startsWith('"')) {
    let quoteBalance = (rawValue.match(/"/g) ?? []).length;
    while (quoteBalance % 2 !== 0 && nextIndex + 1 < lines.length) {
      const candidate = lines[nextIndex + 1];
      const candidateTrimmed = candidate.trim();
      if (candidateTrimmed.startsWith('/')) {
        break;
      }
      nextIndex += 1;
      rawValue += ` ${candidateTrimmed}`;
      quoteBalance += (candidateTrimmed.match(/"/g) ?? []).length;
    }
    rawValue = rawValue.replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"');
  }

  return {
    key,
    value: rawValue,
    nextIndex
  };
};

const parseFeatures = (lines: string[]) => {
  const features: Array<Record<string, unknown>> = [];
  const warnings: string[] = [];

  let inFeatures = false;
  let current: Record<string, unknown> | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!inFeatures) {
      if (line.startsWith('FEATURES')) {
        inFeatures = true;
      }
      continue;
    }

    if (line.startsWith('ORIGIN')) {
      if (current) {
        features.push(current);
      }
      break;
    }

    const featureMatch = line.match(FEATURE_LINE);

    if (featureMatch) {
      if (current) {
        if (
          typeof current.start !== 'number' ||
          typeof current.stop !== 'number'
        ) {
          warnings.push(
            `特征 "${current.type}" 位置信息缺失，已跳过 (Feature "${current.type}" skipped: invalid location).`
          );
        } else {
          if (!current.name) {
            current.name = `${current.type} ${features.length + 1}`;
          }
          features.push(current);
        }
      }

      const [, type, locationRaw] = featureMatch;
      const location = parseLocation(locationRaw);

      if (!location) {
        current = {
          id: randomUUID(),
          type,
          qualifiers: {},
          location: locationRaw.trim()
        };
        continue;
      }

      current = {
        id: randomUUID(),
        type,
        start: location.start,
        stop: location.stop,
        strand: location.strand,
        location: locationRaw.trim(),
        segments: location.segments,
        qualifiers: {}
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('/')) {
      const { key, value, nextIndex } = parseQualifier(lines, index);
      if (key) {
        (current.qualifiers as Record<string, unknown>)[key] = value;
        if (
          !current.name &&
          typeof value === 'string' &&
          ['gene', 'locus_tag', 'product', 'note'].includes(key)
        ) {
          current.name = value;
        }
      }
      index = nextIndex;
    }
  }

  if (current) {
    if (
      typeof current.start !== 'number' ||
      typeof current.stop !== 'number'
    ) {
      warnings.push(
        `特征 "${current.type}" 位置信息缺失，已跳过 (Feature "${current.type}" skipped: invalid location).`
      );
    } else {
      if (!current.name) {
        current.name = `${current.type} ${features.length + 1}`;
      }
      features.push(current);
    }
  }

  return { features, warnings };
};

export class GenBankAnnotationParser implements AnnotationParser {
  summary(): ParserSummary {
    return {
      format: 'genbank',
      displayName: 'GenBank 解析器',
      description: '解析 .gb/.gbk 文件并提取序列、特征与元数据'
    };
  }

  canParse(format: string): boolean {
    return format === 'genbank';
  }

  async parse(request: FileParseRequest): Promise<FileParseResult> {
    const content = readFileSync(request.filePath, 'utf8');
    const lines = splitLines(content);

    const meta = parseMeta(lines);
    const { features, warnings } = parseFeatures(lines);

    meta.recordCount = features.length;

    return {
      dataset: {
        id: randomUUID(),
        projectId: request.projectId,
        format: 'genbank',
        sourcePath: request.filePath,
        meta,
        features
      },
      warnings
    };
  }
}
