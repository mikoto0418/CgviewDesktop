import type { FileParseRequest, FileParseResult } from '@shared/parser/types';
import type { PlotTrack, PlotPoint } from '@shared/domain/visualization';
import {
  normalizeFeatureStates,
  normalizeLinkTracks,
  normalizePlotTracks
} from '@shared/domain/visualization-normalizers';
import { computeDatasetStatistics } from '@shared/domain/dataset-statistics';
import { getDefaultFeatureColor } from '@shared/constants/palette';
import { createDefaultParserRegistry } from './parser-registry';

const registry = createDefaultParserRegistry();
const MAX_FEATURES = 5000;

export const listParsers = () => registry.summaries();

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const inferSequenceLength = (dataset: FileParseResult['dataset']): number => {
  const metaLength = typeof dataset.meta.totalLength === 'number' ? dataset.meta.totalLength : 0;
  const maxFeatureStop = dataset.features.reduce((max, feature) => {
    const record = feature as Record<string, unknown>;
    const start = toNumber(record.start ?? record.begin ?? record.mapStart);
    const stop = toNumber(record.stop ?? record.end ?? record.mapStop);
    if (start === null && stop === null) {
      return max;
    }
    const safeStart = start ?? stop ?? 0;
    const safeStop = stop ?? start ?? safeStart;
    return Math.max(max, Math.max(safeStart, safeStop));
  }, 0);
  return Math.max(metaLength, maxFeatureStop, 0);
};

const generateGcContentPlot = (dataset: FileParseResult['dataset']): PlotTrack | null => {
  const sequenceLength = inferSequenceLength(dataset);
  if (sequenceLength <= 0) {
    return null;
  }

  const bucketCount = Math.max(20, Math.min(200, Math.ceil(sequenceLength / 2000)));
  const bucketSize = sequenceLength / bucketCount;
  const buckets = new Array<number>(bucketCount).fill(0);

  dataset.features.forEach((feature) => {
    const record = feature as Record<string, unknown>;
    const start = toNumber(record.start ?? record.begin ?? record.mapStart);
    const stop = toNumber(record.stop ?? record.end ?? record.mapStop);
    if (start === null && stop === null) {
      return;
    }
    const rawStart = start ?? stop ?? 0;
    const rawStop = stop ?? start ?? rawStart;

    const featureStart = Math.max(0, Math.min(rawStart, rawStop));
    const featureStop = Math.max(featureStart, Math.max(rawStart, rawStop));
    const length = featureStop - featureStart;
    if (!Number.isFinite(length) || length <= 0) {
      return;
    }

    const startIndex = Math.max(0, Math.floor(featureStart / bucketSize));
    const endIndex = Math.min(bucketCount - 1, Math.floor((featureStop - 1) / bucketSize));

    for (let i = startIndex; i <= endIndex; i += 1) {
      const bucketStart = i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const overlap =
        Math.max(0, Math.min(featureStop, bucketEnd) - Math.max(featureStart, bucketStart));
      if (overlap > 0) {
        buckets[i] += overlap;
      }
    }
  });

  const points: PlotPoint[] = buckets.map((coverage, index) => {
    const position = index * bucketSize + bucketSize / 2;
    const value = Math.min(1, Number.isFinite(coverage) ? coverage / bucketSize : 0);
    return { position, value };
  });

  return {
    id: 'gc-content',
    name: 'GC Content',
    kind: 'gc-content',
    color: getDefaultFeatureColor(0),
    points,
    visible: true,
    baseline: 0.5,
    axisMin: 0,
    axisMax: 1,
    source: 'gc-content',
    thicknessRatio: 0.6
  };
};

const normalizeResult = (result: FileParseResult): FileParseResult => {
  const warnings = [...(result.warnings ?? [])];
  const dataset = { ...result.dataset };

  if (dataset.features.length > MAX_FEATURES) {
    warnings.push(
      `Feature count exceeds ${MAX_FEATURES}; truncated for performance.`
    );
    dataset.features = dataset.features.slice(0, MAX_FEATURES);
  }

  dataset.meta.recordCount = dataset.features.length;
  if (!dataset.meta.totalLength || dataset.meta.totalLength < 1) {
    const maxStop = dataset.features.reduce((max, feature) => {
      const record = feature as Record<string, unknown>;
      const stop = Number(record.stop ?? record.end ?? record.mapStop);
      return Number.isFinite(stop) ? Math.max(max, stop) : max;
    }, 0);
    if (maxStop > 0) {
      dataset.meta.totalLength = maxStop;
    }
  }

  const hasPlotTracks = Array.isArray(dataset.plotTracks) && dataset.plotTracks.length > 0;
  if (!hasPlotTracks) {
    const gcTrack = generateGcContentPlot(dataset);
    dataset.plotTracks = gcTrack ? [gcTrack] : [];
  }

  dataset.featureStates = normalizeFeatureStates(dataset.featureStates ?? {});
  dataset.plotTracks = normalizePlotTracks(dataset.plotTracks ?? []);
  dataset.linkTracks = normalizeLinkTracks(dataset.linkTracks ?? []);
  const statistics = computeDatasetStatistics(dataset.features);

  if (dataset.plotTracks.length === 0) {
    warnings.push('No plot tracks available after normalization; viewer will render features only.');
  }

  return {
    dataset: {
      ...dataset,
      statistics
    },
    warnings
  };
};

export const parseFile = async (request: FileParseRequest) => {
  const result = await registry.parse(request);
  return normalizeResult(result);
};



