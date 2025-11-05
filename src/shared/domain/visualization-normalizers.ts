import type { FeatureStateMap } from '@shared/parser/types';
import type { LinkTrack, PlotTrack } from './visualization';
import { getDefaultFeatureColor } from '@shared/constants/palette';

const PLOT_TRACK_KINDS: PlotTrack['kind'][] = [
  'gc-content',
  'gc-skew',
  'coverage',
  'custom'
];

const LINK_TRACK_KINDS: LinkTrack['kind'][] = [
  'alignment',
  'synteny',
  'custom'
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_LINK_COLOR = '#f97316';

export const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  return HEX_COLOR_PATTERN.test(value.trim());
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const toFiniteNumberFromKeys = (
  record: Record<string, unknown>,
  keys: string[]
): number | undefined => {
  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }
    const value = toFiniteNumber(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const ensureId = (value: unknown, fallback: string) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
};

const ensurePlotColor = (value: unknown, index: number) => {
  if (isValidHexColor(value)) {
    return value.trim();
  }
  return getDefaultFeatureColor(index);
};

const ensureLinkColor = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return DEFAULT_LINK_COLOR;
};

const ensurePlotKind = (value: unknown): PlotTrack['kind'] => {
  if (typeof value === 'string') {
    const casted = value.trim() as PlotTrack['kind'];
    if (PLOT_TRACK_KINDS.includes(casted)) {
      return casted;
    }
  }
  return 'custom';
};

const ensureLinkKind = (value: unknown): LinkTrack['kind'] => {
  if (typeof value === 'string') {
    const casted = value.trim() as LinkTrack['kind'];
    if (LINK_TRACK_KINDS.includes(casted)) {
      return casted;
    }
  }
  return 'custom';
};

const ensureBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
};

export const normalizePlotTracks = (input: unknown): PlotTrack[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((rawTrack, index) => {
      const record = rawTrack as Record<string, unknown> | undefined;
      if (!record) {
        return null;
      }

      const id = ensureId(record.id, `plot-${index + 1}`);
      const name = ensureId(record.name, id);
      const color = ensurePlotColor(record.color, index);
      const kind = ensurePlotKind(record.kind);
      const visible = ensureBoolean(record.visible, true);
      const baseline = toFiniteNumber(record.baseline);
      const axisMin = toFiniteNumber(record.axisMin);
      const axisMax = toFiniteNumber(record.axisMax);
      const thicknessRatio = toFiniteNumber(record.thicknessRatio);
      const source = ensureId(record.source, id);

      const pointsRaw = Array.isArray(record.points) ? record.points : [];
      const points = pointsRaw
        .map((value) => {
          const pointRecord = value as Record<string, unknown> | undefined;
          if (!pointRecord) {
            return null;
          }
          const position = toFiniteNumberFromKeys(pointRecord, [
            'position',
            'bp',
            'pos'
          ]);
          const score = toFiniteNumberFromKeys(pointRecord, [
            'value',
            'score'
          ]);
          if (position === undefined || score === undefined) {
            return null;
          }
          return {
            position,
            value: score
          };
        })
        .filter(
          (point): point is PlotTrack['points'][number] => point !== null
        );

      return {
        id,
        name,
        kind,
        color,
        points,
        visible,
        baseline: baseline ?? undefined,
        axisMin: axisMin ?? undefined,
        axisMax: axisMax ?? undefined,
        source,
        thicknessRatio: thicknessRatio ?? undefined
      } satisfies PlotTrack;
    })
    .filter((track): track is PlotTrack => track !== null);
};

export const normalizeLinkTracks = (input: unknown): LinkTrack[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((rawTrack, index) => {
      const record = rawTrack as Record<string, unknown> | undefined;
      if (!record) {
        return null;
      }

      const id = ensureId(record.id, `link-${index + 1}`);
      const name = ensureId(record.name, id);
      const color = ensureLinkColor(record.color);
      const visible = ensureBoolean(record.visible, true);
      const thicknessRatio = toFiniteNumber(record.thicknessRatio);
      const kind = ensureLinkKind(record.kind);

      const connectionsRaw = Array.isArray(record.connections)
        ? record.connections
        : [];
      const connections = connectionsRaw
        .map((value) => {
          const connection = value as Record<string, unknown> | undefined;
          if (!connection) {
            return null;
          }
          const sourceStart = toFiniteNumber(connection.sourceStart);
          const sourceEnd = toFiniteNumber(connection.sourceEnd);
          const targetStart = toFiniteNumber(connection.targetStart);
          const targetEnd = toFiniteNumber(connection.targetEnd);
          if (
            sourceStart === undefined ||
            sourceEnd === undefined ||
            targetStart === undefined ||
            targetEnd === undefined
          ) {
            return null;
          }
          const valueScore = toFiniteNumber(connection.value);
          const linkColor =
            typeof connection.color === 'string'
              ? connection.color.trim()
              : undefined;

          return {
            sourceStart,
            sourceEnd,
            targetStart,
            targetEnd,
            value: valueScore,
            color: linkColor && linkColor.length > 0 ? linkColor : undefined
          } satisfies LinkTrack['connections'][number];
        })
        .filter(
          (connection): connection is LinkTrack['connections'][number] =>
            connection !== null
        );

      return {
        id,
        name,
        kind,
        color,
        visible,
        connections,
        thicknessRatio: thicknessRatio ?? undefined
      } satisfies LinkTrack;
    })
    .filter((track): track is LinkTrack => track !== null);
};

export const normalizeFeatureStates = (input: unknown): FeatureStateMap => {
  const result: FeatureStateMap = {};
  if (!input || typeof input !== 'object') {
    return result;
  }

  const entries = Object.entries(input as Record<string, unknown>);
  entries.forEach(([rawKey, value]) => {
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (!key) {
      return;
    }
    const record = value as Record<string, unknown> | undefined;
    const visible = ensureBoolean(record?.visible, true);
    const colorCandidate =
      typeof record?.color === 'string' ? record.color.trim() : '';
    const color =
      colorCandidate.length > 0 ? colorCandidate : getDefaultFeatureColor(0);
    result[key] = {
      visible,
      color
    };
  });

  return result;
};
