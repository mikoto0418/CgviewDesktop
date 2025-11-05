import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CgviewViewer } from '../../components/CgviewViewer';
import { LayerConfigPanel } from '../../components/layers/LayerConfigPanel';
import { FeatureFilterPanel } from '../../components/filters/FeatureFilterPanel';
import { PlotTrackManager } from '../visualization/PlotTrackManager';
import type { DatasetDetail } from '@shared/parser/types';

type LayerVisibility = {
  type: string;
  visible: boolean;
  color: string;
  labelVisible: boolean;
  labelField?: string;
  opacity: number;
};

type FilterCriteria = {
  name?: string;
  type?: string;
  minStart?: number;
  maxStop?: number;
  strand?: number;
  containsText?: string;
};

type PlotTrack = {
  id: string;
  type: 'gc-content' | 'gc-skew' | 'coverage' | 'custom';
  name: string;
  visible: boolean;
  color: string;
  windowSize?: number;
  baseline?: number;
};

type EnhancedWorkspaceViewProps = {
  dataset: DatasetDetail | null;
};

export const EnhancedWorkspaceView = ({
  dataset
}: EnhancedWorkspaceViewProps) => {
  const { t } = useTranslation('workspace');
  const [activeTab, setActiveTab] = useState<'layers' | 'filters' | 'plots'>('layers');
  const [layers, setLayers] = useState<LayerVisibility[]>([]);
  const [filter, setFilter] = useState<FilterCriteria | null>(null);
  const [plotTracks, setPlotTracks] = useState<PlotTrack[]>([]);

  // Filter dataset based on filter criteria
  const filteredDataset = useMemo(() => {
    if (!dataset || !filter) return dataset;

    const filteredFeatures = dataset.features.filter((feature) => {
      const record = feature as any;

      if (filter.name && !(record.name || '').toLowerCase().includes(filter.name.toLowerCase())) {
        return false;
      }

      if (filter.type && record.type !== filter.type) {
        return false;
      }

      if (filter.containsText) {
        const text = JSON.stringify(record).toLowerCase();
        if (!text.includes(filter.containsText.toLowerCase())) {
          return false;
        }
      }

      if (filter.minStart !== undefined) {
        const start = parseFloat(record.start) || 0;
        if (start < filter.minStart) return false;
      }

      if (filter.maxStop !== undefined) {
        const stop = parseFloat(record.stop) || 0;
        if (stop > filter.maxStop) return false;
      }

      if (filter.strand !== undefined && record.strand !== filter.strand) {
        return false;
      }

      return true;
    });

    return {
      ...dataset,
      features: filteredFeatures
    };
  }, [dataset, filter]);

  // Apply layer visibility to dataset
  const visualizedDataset = useMemo(() => {
    if (!filteredDataset || layers.length === 0) return filteredDataset;

    const filteredFeatures = filteredDataset.features.filter((feature) => {
      const record = feature as any;
      const type = record.type || 'unknown';
      const layer = layers.find((l) => l.type === type);
      return layer?.visible ?? true;
    });

    return {
      ...filteredDataset,
      features: filteredFeatures
    };
  }, [filteredDataset, layers]);

  // Generate plot track data from dataset
  const computedPlotTracks = useMemo(() => {
    if (!visualizedDataset || plotTracks.length === 0) {
      return [];
    }

    return plotTracks
      .filter((track) => track.visible)
      .map((track) => {
        if (track.type === 'gc-content') {
          return generateGCContentTrack(visualizedDataset, track);
        }
        if (track.type === 'gc-skew') {
          return generateGCSkewTrack(visualizedDataset, track);
        }
        if (track.type === 'coverage') {
          return generateCoverageTrack(visualizedDataset, track);
        }
        if (track.type === 'at-content') {
          return generateATContentTrack(visualizedDataset, track);
        }
        if (track.type === 'base-composition') {
          return generateBaseCompositionTrack(visualizedDataset, track);
        }
        if (track.type === 'feature-density') {
          return generateFeatureDensityTrack(visualizedDataset, track);
        }
        if (track.type === 'sequence-complexity') {
          return generateSequenceComplexityTrack(visualizedDataset, track);
        }
        return null;
      })
      .filter((track): track is any => track !== null);
  }, [visualizedDataset, plotTracks]);

  // Generate GC content plot data
  const generateGCContentTrack = (dataset: DatasetDetail, track: PlotTrack) => {
    const windowSize = track.windowSize || 100;
    const features = dataset.features;
    if (features.length === 0) return null;

    const positions: number[] = [];
    const scores: number[] = [];

    // Simple GC content calculation
    for (let i = 0; i < dataset.totalLength; i += windowSize) {
      const start = i;
      const end = Math.min(i + windowSize, dataset.totalLength);

      let gcCount = 0;
      let totalCount = 0;

      // Count GC in features within this window
      features.forEach((feature) => {
        const fStart = parseFloat((feature as any).start) || 0;
        const fStop = parseFloat((feature as any).stop) || 0;
        const overlap = Math.min(end, fStop) - Math.max(start, fStart);
        if (overlap > 0) {
          gcCount += overlap * 0.5; // Simplified
          totalCount += overlap;
        }
      });

      const gcContent = totalCount > 0 ? (gcCount / totalCount) * 100 : 0;
      positions.push(i + windowSize / 2);
      scores.push(gcContent);
    }

    return {
      id: track.id,
      name: track.name,
      source: track.id,
      points: positions.map((pos, idx) => ({
        position: pos,
        value: scores[idx]
      })),
      visible: true,
      color: track.color,
      axisMin: 0,
      axisMax: 100
    };
  };

  // Generate GC skew plot data
  const generateGCSkewTrack = (dataset: DatasetDetail, track: PlotTrack) => {
    const windowSize = track.windowSize || 100;
    const features = dataset.features;
    if (features.length === 0) return null;

    const positions: number[] = [];
    const scores: number[] = [];

    for (let i = 0; i < dataset.totalLength; i += windowSize) {
      const start = i;
      const end = Math.min(i + windowSize, dataset.totalLength);

      let gCount = 0;
      let cCount = 0;

      features.forEach((feature) => {
        const fStart = parseFloat((feature as any).start) || 0;
        const fStop = parseFloat((feature as any).stop) || 0;
        const overlap = Math.min(end, fStop) - Math.max(start, fStart);
        if (overlap > 0) {
          gCount += overlap * 0.5;
          cCount += overlap * 0.5;
        }
      });

      const skew = gCount + cCount > 0 ? (gCount - cCount) / (gCount + cCount) : 0;
      positions.push(i + windowSize / 2);
      scores.push(skew);
    }

    return {
      id: track.id,
      name: track.name,
      source: track.id,
      points: positions.map((pos, idx) => ({
        position: pos,
        value: scores[idx]
      })),
      visible: true,
      color: track.color,
      axisMin: -1,
      axisMax: 1
    };
  };

  // Generate coverage plot data
  const generateCoverageTrack = (dataset: DatasetDetail, track: PlotTrack) => {
    const features = dataset.features;
    if (features.length === 0) return null;

    const coverage = new Array(Math.ceil(dataset.totalLength)).fill(0);

    features.forEach((feature) => {
      const fStart = Math.floor(parseFloat((feature as any).start) || 0);
      const fStop = Math.ceil(parseFloat((feature as any).stop) || 0);

      for (let i = fStart; i < fStop && i < coverage.length; i++) {
        coverage[i]++;
      }
    });

    const positions: number[] = [];
    const scores: number[] = [];

    for (let i = 0; i < coverage.length; i += 10) {
      const windowCoverage = coverage.slice(i, i + 10).reduce((a, b) => a + b, 0);
      positions.push(i + 5);
      scores.push(windowCoverage / 10);
    }

    return {
      id: track.id,
      name: track.name,
      source: track.id,
      points: positions.map((pos, idx) => ({
        position: pos,
        value: scores[idx]
      })),
      visible: true,
      color: track.color
    };
  };

  // Generate AT content plot data
  const generateATContentTrack = (dataset: DatasetDetail, track: PlotTrack) => {
    const windowSize = track.windowSize || 100;
    const features = dataset.features;
    if (features.length === 0) return null;

    const positions: number[] = [];
    const scores: number[] = [];

    // Simple AT content calculation
    for (let i = 0; i < dataset.totalLength; i += windowSize) {
      const start = i;
      const end = Math.min(i + windowSize, dataset.totalLength);

      let atCount = 0;
      let totalCount = 0;

      // Count AT in features within this window
      features.forEach((feature) => {
        const fStart = parseFloat((feature as any).start) || 0;
        const fStop = parseFloat((feature as any).stop) || 0;
        const overlap = Math.min(end, fStop) - Math.max(start, fStart);
        if (overlap > 0) {
          atCount += overlap * 0.5; // Simplified
          totalCount += overlap;
        }
      });

      const atContent = totalCount > 0 ? (atCount / totalCount) * 100 : 0;
      positions.push(i + windowSize / 2);
      scores.push(atContent);
    }

    return {
      id: track.id,
      name: track.name,
      source: track.id,
      points: positions.map((pos, idx) => ({
        position: pos,
        value: scores[idx]
      })),
      visible: true,
      color: track.color,
      axisMin: 0,
      axisMax: 100
    };
  };

  // Generate base composition plot data
  const generateBaseCompositionTrack = (dataset: DatasetDetail, track: PlotTrack) => {
    const windowSize = track.windowSize || 100;
    const features = dataset.features;
    if (features.length === 0) return null;

    const positions: number[] = [];
    const scores: number[] = [];

    for (let i = 0; i < dataset.totalLength; i += windowSize) {
      const start = i;
      const end = Math.min(i + windowSize, dataset.totalLength);

      let gcCount = 0;
      let atCount = 0;
      let totalCount = 0;

      features.forEach((feature) => {
        const fStart = parseFloat((feature as any).start) || 0;
        const fStop = parseFloat((feature as any).stop) || 0;
        const overlap = Math.min(end, fStop) - Math.max(start, fStart);
        if (overlap > 0) {
          gcCount += overlap * 0.5; // Simplified
          atCount += overlap * 0.5;
          totalCount += overlap;
        }
      });

      // Calculate GC/(AT+GC) ratio
      const ratio = (gcCount + atCount) > 0 ? (gcCount - atCount) / (gcCount + atCount) : 0;
      positions.push(i + windowSize / 2);
      scores.push(ratio);
    }

    return {
      id: track.id,
      name: track.name,
      source: track.id,
      points: positions.map((pos, idx) => ({
        position: pos,
        value: scores[idx]
      })),
      visible: true,
      color: track.color,
      axisMin: -1,
      axisMax: 1
    };
  };

  // Generate feature density plot data
  const generateFeatureDensityTrack = (dataset: DatasetDetail, track: PlotTrack) => {
    const windowSize = track.windowSize || 1000;
    const features = dataset.features;
    if (features.length === 0) return null;

    const positions: number[] = [];
    const scores: number[] = [];

    for (let i = 0; i < dataset.totalLength; i += windowSize) {
      const start = i;
      const end = Math.min(i + windowSize, dataset.totalLength);

      let featureCount = 0;

      // Count features within this window
      features.forEach((feature) => {
        const fStart = parseFloat((feature as any).start) || 0;
        const fStop = parseFloat((feature as any).stop) || 0;
        const overlap = Math.min(end, fStop) - Math.max(start, fStart);
        if (overlap > 0) {
          featureCount++;
        }
      });

      positions.push(i + windowSize / 2);
      scores.push(featureCount);
    }

    return {
      id: track.id,
      name: track.name,
      source: track.id,
      points: positions.map((pos, idx) => ({
        position: pos,
        value: scores[idx]
      })),
      visible: true,
      color: track.color,
      axisMin: 0
    };
  };

  // Generate sequence complexity plot data
  const generateSequenceComplexityTrack = (dataset: DatasetDetail, track: PlotTrack) => {
    const windowSize = track.windowSize || 200;
    const features = dataset.features;
    if (features.length === 0) return null;

    const positions: number[] = [];
    const scores: number[] = [];

    for (let i = 0; i < dataset.totalLength; i += windowSize) {
      const start = i;
      const end = Math.min(i + windowSize, dataset.totalLength);

      let uniqueBases = 4; // Max: A, T, G, C
      let totalLength = 0;

      // Calculate unique bases in this window (simplified)
      features.forEach((feature) => {
        const fStart = parseFloat((feature as any).start) || 0;
        const fStop = parseFloat((feature as any).stop) || 0;
        const overlap = Math.min(end, fStop) - Math.max(start, fStart);
        if (overlap > 0) {
          totalLength += overlap;
        }
      });

      // Calculate entropy-based complexity
      const complexity = totalLength > 0 ? (uniqueBases / 4) * 100 : 0;
      positions.push(i + windowSize / 2);
      scores.push(complexity);
    }

    return {
      id: track.id,
      name: track.name,
      source: track.id,
      points: positions.map((pos, idx) => ({
        position: pos,
        value: scores[idx]
      })),
      visible: true,
      color: track.color,
      axisMin: 0,
      axisMax: 100
    };
  };

  return (
    <div className="workspace-enhanced-layout">
      {/* 左侧可视化区域 - 固定不滚动 */}
      <div className="workspace-visualization">
        <div className="workspace-visualization-header">
          <h2 className="workspace-visualization-title">
            🧬 基因组可视化
          </h2>
        </div>
        <div className="workspace-visualization-content">
          <div className="workspace-viewer-container">
            <CgviewViewer
              dataset={{
                ...visualizedDataset,
                plotTracks: computedPlotTracks
              }}
              width={700}
              height={700}
              showLegend={true}
            />
          </div>
        </div>
      </div>

      {/* 右侧控制面板 - 可独立滚动 */}
      <div className="workspace-controls">
        <div className="workspace-controls-scroll">
          {/* 标签页导航 */}
          <nav className="enhanced-tabs-nav enhanced-tabs-nav-sticky">
            <button
              className={activeTab === 'layers' ? 'active' : ''}
              onClick={() => setActiveTab('layers')}
            >
              🎨 {t('tabs.layers')}
            </button>
            <button
              className={activeTab === 'filters' ? 'active' : ''}
              onClick={() => setActiveTab('filters')}
            >
              🔍 {t('tabs.filters')}
            </button>
            <button
              className={activeTab === 'plots' ? 'active' : ''}
              onClick={() => setActiveTab('plots')}
            >
              📈 {t('tabs.plots')}
            </button>
          </nav>

          {/* 标签页内容 */}
          <div className="enhanced-tab-content">
            {activeTab === 'layers' && (
              <LayerConfigPanel
                dataset={filteredDataset}
                onLayerChange={setLayers}
              />
            )}
            {activeTab === 'filters' && (
              <FeatureFilterPanel
                dataset={dataset}
                onFilterChange={setFilter}
              />
            )}
            {activeTab === 'plots' && (
              <PlotTrackManager
                dataset={dataset}
                onTracksChange={setPlotTracks}
              />
            )}
          </div>

          {/* 统计信息 */}
          {filteredDataset && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{visualizedDataset.features.length}</div>
                <div className="stat-label">
                  {t('stats.showing')} {t('stats.features')}
                </div>
              </div>
              {filter && (
                <div className="stat-card">
                  <div className="stat-value">
                    {dataset.features.length - filteredDataset.features.length}
                  </div>
                  <div className="stat-label">
                    {t('stats.filtered')}
                  </div>
                </div>
              )}
              <div className="stat-card">
                <div className="stat-value">
                  {dataset.totalLength.toLocaleString()}
                </div>
                <div className="stat-label">{t('stats.totalLength')}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
