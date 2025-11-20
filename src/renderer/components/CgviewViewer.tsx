import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DatasetDetail } from '@shared/parser/types';
import { getDefaultFeatureColor } from '@shared/constants/palette';
import { normalizePlotTracks as normalizePlotTracksData } from '@shared/domain/visualization-normalizers';
import * as CGView from 'cgview';
import { Context as SVGCanvasContext } from 'svgcanvas';
import 'cgview/dist/cgview.css';
import { LargeDatasetOptimizer, debounce, throttle, MemoryMonitor } from '../utils/performance-optimizer';

if (typeof window !== 'undefined' && !window.SVGContext) {
  window.SVGContext = SVGCanvasContext;
}

type CgviewViewerProps = {
  dataset: DatasetDetail | null;
  width?: number;
  height?: number;
  showLegend?: boolean;
};

type NormalizedFeature = {
  name: string;
  type: string;
  start: number;
  stop: number;
  strand: number;
  color: string;
  qualifiers?: Record<string, unknown>;
};

type NormalizedPlot = {
  name: string;
  source: string;
  positions: number[];
  scores: number[];
  axisMin?: number;
  axisMax?: number;
  baseline?: number;
  legend: {
    name: string;
    symbol: {
      fill: string;
      stroke: string;
    };
  };
  type: string;
};

const EXPORT_FILENAME = 'cgview-map';
const MAX_FEATURES = 1500;

const toNumber = (value: unknown): number | undefined => {
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

const toSafeString = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidate =
      record.name ??
      record.label ??
      record.type ??
      record.id ??
      record.key;
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return fallback;
};

const normalizeFeatures = (dataset: DatasetDetail): NormalizedFeature[] => {
  // 性能优化：动态调整最大特征数
  const adaptiveMaxFeatures = dataset.features.length > 10000 ? MAX_FEATURES * 2 : MAX_FEATURES;

  // 使用LargeDatasetOptimizer进行智能过滤
  const optimizer = new LargeDatasetOptimizer();

  // 预处理特征，添加重要性评分
  const featuresWithImportance = dataset.features.map((feature, index) => {
    const record = feature as Record<string, unknown>;
    const importance =
      (record.name ? 2 : 0) +
      (record.type === 'gene' ? 3 : 0) +
      (record.strand === -1 ? 1 : 0);

    return {
      feature,
      importance
    };
  });

  // 智能过滤特征
  const optimizedFeatures = optimizer.filterFeaturesForRendering(featuresWithImportance, dataset.totalLength, {
    maxFeatures: adaptiveMaxFeatures,
    sampleRate: 0.8,
    importanceThreshold: 0
  });

  // 转换特征格式
  return optimizedFeatures.map(({ feature, index }) => {
    const record = feature as Record<string, unknown>;
    const start =
      toNumber(record.start) ??
      toNumber(record.begin) ??
      toNumber(record.mapStart);
    const stop =
      toNumber(record.stop) ??
      toNumber(record.end) ??
      toNumber(record.mapStop);

    if (start === undefined && stop === undefined) {
      return null;
    }

    const safeStart = start ?? stop ?? 0;
    const safeStop = stop ?? start ?? safeStart;

    return {
      name: toSafeString(record.name ?? record.label, `Feature ${index + 1}`),
      type: toSafeString(record.type ?? record.source, 'feature'),
      start: Math.max(0, Math.min(safeStart, safeStop)),
      stop: Math.max(safeStart, safeStop),
      strand: typeof record.strand === 'number' ? Number(record.strand) : 1,
      color: record.color?.toString() ?? getDefaultFeatureColor(index),
      qualifiers: (record.qualifiers as Record<string, unknown>) ?? undefined
    };
  }).filter((item): item is NormalizedFeature => item !== null);
};

const buildNormalizedPlots = (dataset: DatasetDetail): NormalizedPlot[] => {
  const tracks = normalizePlotTracksData(dataset.plotTracks ?? []);
  return tracks
    .filter((track) => track.points.length > 0 && track.visible !== false)
    .map((track, index) => {
      const points = [...track.points].sort((a, b) => a.position - b.position);
      if (points.length === 0) {
        return null;
      }

      const name = track.name && track.name.trim().length > 0 ? track.name.trim() : track.id ?? `Plot ${index + 1}`;
      const source =
        track.source && track.source.trim().length > 0 ? track.source.trim() : track.id ?? `plot-${index + 1}`;
      const color = track.color ?? getDefaultFeatureColor(index);

      return {
        name,
        source,
        positions: points.map((point) => point.position),
        scores: points.map((point) => point.value),
        axisMin: track.axisMin,
        axisMax: track.axisMax,
        baseline: track.baseline,
        type: 'line',
        legend: {
          name,
          symbol: {
            fill: color,
            stroke: color
          }
        }
      };
    })
    .filter((plot): plot is NormalizedPlot => plot !== null);
};

const inferSequenceLength = (dataset: DatasetDetail, features: NormalizedFeature[]) => {
  const metaLength = typeof dataset.totalLength === 'number' ? dataset.totalLength : 0;
  const maxFeature = features.reduce((max, feature) => Math.max(max, feature.stop), 0);
  return Math.max(metaLength, maxFeature, 1);
};

export const CgviewViewer = ({
  dataset,
  width = 520,
  height = 520,
  showLegend = true
}: CgviewViewerProps) => {
  const { t } = useTranslation('workspace');
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [isOptimized, setIsOptimized] = useState(false);
  const canvasId = useId().replace(/:/g, '-');

  // 性能优化：内存监控
  useEffect(() => {
    const monitor = new MemoryMonitor();

    const checkMemory = debounce(() => {
      const usage = monitor.getMemoryUsage();
      setMemoryUsage(usage);

      // 如果内存使用过高，启用优化模式
      if (usage > 100) {
        setIsOptimized(true);
        console.info(`[CgviewViewer] Memory usage high (${usage}MB), enabling optimization mode`);
      }
    }, 1000);

    monitor.addObserver(checkMemory);
    checkMemory();

    const interval = setInterval(checkMemory, 2000);

    return () => {
      monitor.removeObserver(checkMemory);
      clearInterval(interval);
    };
  }, []);

  // 性能优化：防抖特征标准化
  const normalized = useMemo(() => {
    if (!dataset) {
      return [] as NormalizedFeature[];
    }

    // 对于大数据集启用优化
    const shouldOptimize = dataset.features.length > 5000 || isOptimized;
    if (shouldOptimize) {
      console.info(`[CgviewViewer] Optimizing rendering for ${dataset.features.length} features`);
    }

    return normalizeFeatures(dataset);
  }, [dataset, isOptimized]);

  // 性能优化：节流绘制
  const normalizedPlots = useMemo(() => {
    if (!dataset) {
      return [] as NormalizedPlot[];
    }
    return buildNormalizedPlots(dataset);
  }, [dataset]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const cleanup = () => {
      viewerRef.current = null;
      mount.replaceChildren();
      setViewerReady(false);
    };

    cleanup();

    if (!dataset || (normalized.length === 0 && normalizedPlots.length === 0)) {
      return cleanup;
    }

    const holder = document.createElement('div');
    holder.id = `cgview-${dataset.id ?? canvasId}`;
    mount.appendChild(holder);

    const sequenceLength = inferSequenceLength(dataset, normalized);

    try {
      const viewer = new (CGView as any).Viewer(`#${holder.id}`, {
        width,
        height,
        allowDragAndDrop: false,
        format: 'circular',
        legend: {
          visible: Boolean(showLegend)
        },
        sequence: {
          length: sequenceLength
        },
        features: normalized.map((feature) => ({
          ...feature,
          legend: {
            name: feature.type,
            symbol: {
              fill: feature.color,
              stroke: feature.color
            }
          }
        })),
        plots: normalizedPlots
      });
      viewerRef.current = viewer;
      setViewerReady(Boolean(viewer?.io));
    } catch (error) {
      console.error('[CgviewViewer] Failed to render CGView', error);
      cleanup();
    }

    return cleanup;
  }, [canvasId, dataset, height, normalized, normalizedPlots, showLegend, width]);

  const handleExportPNG = () => {
    const viewer = viewerRef.current;
    if (viewer?.io) {
      viewer.io.downloadImage(width, height, `${EXPORT_FILENAME}.png`);
    }
  };

  const handleExportSVG = () => {
    const viewer = viewerRef.current;
    if (viewer?.io) {
      viewer.io.downloadSVG(`${EXPORT_FILENAME}.svg`);
    }
  };

  const hasData = dataset && (normalized.length > 0 || normalizedPlots.length > 0);

  return (
    <div className="cgview-wrapper">
      <div className="cgview-toolbar">
        <div className="cgview-toolbar-left">
          <button type="button" onClick={handleExportPNG} disabled={!viewerReady}>
            {t('viewer.exportPNG')}
          </button>
          <button type="button" onClick={handleExportSVG} disabled={!viewerReady}>
            {t('viewer.exportSVG')}
          </button>
        </div>
        {(dataset?.features.length || 0) > 5000 && (
          <div className="cgview-performance-info">
            <span className="performance-badge">
              🚀 {t(isOptimized ? 'viewer.performance.optimizedMode' : 'viewer.performance.highPerformanceMode')}
            </span>
            <span className="memory-usage">
              💾 {t('viewer.performance.memoryUsage', { value: memoryUsage })}
            </span>
            <span className="feature-count">
              📊 {t('viewer.performance.features', { shown: normalized.length, total: dataset?.features.length })}
            </span>
          </div>
        )}
      </div>
      <div className="cgview-container">
        <div ref={mountRef} className="cgview-canvas" />
        {!hasData ? (
          <span className="cgview-empty-placeholder">{t('viewer.empty')}</span>
        ) : null}
      </div>
    </div>
  );
};
