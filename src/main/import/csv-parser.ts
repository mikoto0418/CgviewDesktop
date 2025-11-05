import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import Papa from 'papaparse';
import type {
  AnnotationParser,
  FileParseRequest,
  FileParseResult,
  ParsedDatasetMeta,
  ParserSummary
} from '@shared/parser/types';

type ParsedRow = Record<string, unknown>;

const REQUIRED_COLUMNS = ['start', 'stop'] as const;

const toNormalizedKey = (value: string) => value.trim().toLowerCase();

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const normalizeStrand = (value: unknown): number => {
  if (typeof value === 'number') {
    return value >= 0 ? 1 : -1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['-', 'reverse', 'rev', '-1', 'negative'].includes(normalized)) {
      return -1;
    }
    if (['+', 'forward', 'fwd', '1', 'positive'].includes(normalized)) {
      return 1;
    }
  }
  return 1;
};

const normalizeRow = (row: ParsedRow, index: number) => {
  const lowered: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    lowered[toNormalizedKey(key)] = value;
  });

  const start =
    toNumber(lowered.start) ??
    toNumber(lowered.begin) ??
    toNumber(lowered.map_start) ??
    toNumber(lowered.offset);
  const stop =
    toNumber(lowered.stop) ??
    toNumber(lowered.end) ??
    toNumber(lowered.map_stop) ??
    toNumber(lowered.length ? Number(lowered.length) + (start ?? 0) : undefined);

  if (start === undefined && stop === undefined) {
    return {
      feature: null,
      warning: `第 ${index + 1} 行缺少起止坐标，已跳过 (Row ${index + 1} skipped: missing start/stop).`
    };
  }

  const safeStart = start ?? stop ?? 0;
  const safeStop = stop ?? start ?? safeStart;

  const type =
    (lowered.type as string) ??
    (lowered.feature as string) ??
    (lowered.category as string) ??
    'feature';

  const name =
    (lowered.name as string) ??
    (lowered.label as string) ??
    (lowered.id as string) ??
    `${type} ${index + 1}`;

  const color =
    (lowered.color as string) ??
    (lowered.colour as string) ??
    (lowered.hex as string);

  const qualifiers = { ...lowered };
  delete qualifiers.start;
  delete qualifiers.begin;
  delete qualifiers.map_start;
  delete qualifiers.offset;
  delete qualifiers.stop;
  delete qualifiers.end;
  delete qualifiers.map_stop;
  delete qualifiers.length;
  delete qualifiers.type;
  delete qualifiers.feature;
  delete qualifiers.category;
  delete qualifiers.name;
  delete qualifiers.label;
  delete qualifiers.id;
  delete qualifiers.color;
  delete qualifiers.colour;
  delete qualifiers.hex;

  return {
    feature: {
      id: randomUUID(),
      type,
      name,
      start: Math.min(safeStart, safeStop),
      stop: Math.max(safeStart, safeStop),
      strand: normalizeStrand(lowered.strand ?? lowered.direction),
      color: color ?? undefined,
      qualifiers: Object.keys(qualifiers).length > 0 ? qualifiers : undefined
    },
    warning: null as string | null
  };
};

const parseMeta = (rows: ParsedRow[]): ParsedDatasetMeta => {
  const meta: ParsedDatasetMeta = { recordCount: rows.length };

  for (const row of rows) {
    const lowered: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      lowered[toNormalizedKey(key)] = value;
    });

    if (!meta.organism && typeof lowered.organism === 'string') {
      meta.organism = lowered.organism;
    }

    if (!meta.totalLength) {
      const length = toNumber(lowered.sequence_length ?? lowered.length ?? lowered.total_length);
      if (length && length > 0) {
        meta.totalLength = length;
      }
    }

    if (meta.organism && meta.totalLength) {
      break;
    }
  }

  return meta;
};

export class CsvAnnotationParser implements AnnotationParser {
  summary(): ParserSummary {
    return {
      format: 'csv',
      displayName: 'CSV 轨迹解析器',
      description: '读取逗号分隔的特征列表（start, stop, name, type, strand, color 等列）'
    };
  }

  canParse(format: string): boolean {
    return format === 'csv';
  }

  async parse(request: FileParseRequest): Promise<FileParseResult> {
    const raw = readFileSync(request.filePath, 'utf8');
    const result = Papa.parse<ParsedRow>(raw, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (result.errors.length > 0) {
      const first = result.errors[0];
      throw new Error(
        `CSV 解析失败：${first.message} (row: ${first.row ?? 'n/a'})`
      );
    }

    const rows = result.data;
    if (rows.length === 0) {
      return {
        dataset: {
          id: randomUUID(),
          projectId: request.projectId,
          format: 'csv',
          sourcePath: request.filePath,
          meta: { recordCount: 0 },
          features: []
        },
        warnings: ['文件为空，未解析到任何特征 (File empty: no features parsed).']
      };
    }

    const headers = Object.keys(rows[0] ?? {}).map(toNormalizedKey);
    for (const required of REQUIRED_COLUMNS) {
      if (!headers.includes(required) && !headers.includes(required === 'start' ? 'begin' : 'end')) {
        throw new Error(
          `CSV 缺少必要列 "${required}"，请补充 start/stop 信息 (Missing required column "${required}").`
        );
      }
    }

    const meta = parseMeta(rows);
    const features: Array<Record<string, unknown>> = [];
    const warnings: string[] = [];
    let maxStop = meta.totalLength ?? 0;

    rows.forEach((row, index) => {
      const { feature, warning } = normalizeRow(row, index);
      if (warning) {
        warnings.push(warning);
      }
      if (feature) {
        maxStop = Math.max(maxStop, Number(feature.stop));
        features.push(feature);
      }
    });

    if (!meta.totalLength && maxStop > 0) {
      meta.totalLength = maxStop;
    }
    meta.recordCount = features.length;

    return {
      dataset: {
        id: randomUUID(),
        projectId: request.projectId,
        format: 'csv',
        sourcePath: request.filePath,
        meta,
        features
      },
      warnings
    };
  }
}

