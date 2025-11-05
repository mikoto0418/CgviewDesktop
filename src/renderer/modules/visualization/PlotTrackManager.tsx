import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DatasetDetail } from '@shared/parser/types';

type PlotType = 'gc-content' | 'gc-skew' | 'coverage' | 'at-content' | 'base-composition' | 'feature-density' | 'sequence-complexity' | 'custom';

type PlotTrack = {
  id: string;
  type: PlotType;
  name: string;
  visible: boolean;
  color: string;
  windowSize?: number;
  baseline?: number;
};

type PlotTrackManagerProps = {
  dataset: DatasetDetail | null;
  onTracksChange: (tracks: PlotTrack[]) => void;
};

export const PlotTrackManager = ({
  dataset,
  onTracksChange
}: PlotTrackManagerProps) => {
  const { t } = useTranslation('workspace');
  const [tracks, setTracks] = useState<PlotTrack[]>([]);

  const handleAddTrack = (type: PlotType) => {
    const newTrack: PlotTrack = {
      id: `plot-${Date.now()}`,
      type,
      name: getDefaultName(type),
      visible: true,
      color: getDefaultColor(type),
      windowSize: type === 'gc-content' || type === 'gc-skew' ? 100 : undefined,
      baseline: type === 'coverage' ? 0 : undefined
    };

    const updated = [...tracks, newTrack];
    setTracks(updated);
    onTracksChange(updated);
  };

  const handleRemoveTrack = (id: string) => {
    const updated = tracks.filter((t) => t.id !== id);
    setTracks(updated);
    onTracksChange(updated);
  };

  const handleToggleVisibility = (id: string) => {
    const updated = tracks.map((track) =>
      track.id === id ? { ...track, visible: !track.visible } : track
    );
    setTracks(updated);
    onTracksChange(updated);
  };

  const handleUpdateTrack = (id: string, updates: Partial<PlotTrack>) => {
    const updated = tracks.map((track) =>
      track.id === id ? { ...track, ...updates } : track
    );
    setTracks(updated);
    onTracksChange(updated);
  };

  const getDefaultName = (type: PlotType): string => {
    const names: Record<PlotType, string> = {
      'gc-content': t('plots.gcContent'),
      'gc-skew': t('plots.gcSkew'),
      'coverage': t('plots.coverage'),
      'at-content': t('plots.atContent'),
      'base-composition': t('plots.baseComposition'),
      'feature-density': t('plots.featureDensity'),
      'sequence-complexity': t('plots.sequenceComplexity'),
      'custom': t('plots.custom')
    };
    return names[type];
  };

  const getDefaultColor = (type: PlotType): string => {
    const colors: Record<PlotType, string> = {
      'gc-content': '#e74c3c',
      'gc-skew': '#3498db',
      'coverage': '#2ecc71',
      'at-content': '#f39c12',
      'base-composition': '#1abc9c',
      'feature-density': '#9b59b6',
      'sequence-complexity': '#34495e',
      'custom': '#95a5a6'
    };
    return colors[type];
  };

  const canAddPlot = dataset && dataset.features && dataset.features.length > 0;

  return (
    <div className="plot-track-manager">
      <div className="panel-header">
        <h3>{t('plots.title')}</h3>
      </div>

      {canAddPlot ? (
        <>
          <div className="add-plot-buttons">
            <button onClick={() => handleAddTrack('gc-content')} className="btn-primary">
              {t('plots.addGCContent')}
            </button>
            <button onClick={() => handleAddTrack('gc-skew')} className="btn-primary">
              {t('plots.addGCSkew')}
            </button>
            <button onClick={() => handleAddTrack('coverage')} className="btn-primary">
              {t('plots.addCoverage')}
            </button>
            <button onClick={() => handleAddTrack('at-content')} className="btn-primary">
              {t('plots.addATContent')}
            </button>
            <button onClick={() => handleAddTrack('base-composition')} className="btn-primary">
              {t('plots.addBaseComposition')}
            </button>
            <button onClick={() => handleAddTrack('feature-density')} className="btn-primary">
              {t('plots.addFeatureDensity')}
            </button>
            <button onClick={() => handleAddTrack('sequence-complexity')} className="btn-primary">
              {t('plots.addSequenceComplexity')}
            </button>
          </div>

          <div className="plot-tracks-list">
            {tracks.map((track) => (
              <div key={track.id} className="plot-track-item">
                <div className="track-header">
                  <label className="track-name">
                    <input
                      type="checkbox"
                      checked={track.visible}
                      onChange={() => handleToggleVisibility(track.id)}
                    />
                    <span>{track.name}</span>
                  </label>
                  <button
                    onClick={() => handleRemoveTrack(track.id)}
                    className="btn-danger btn-sm"
                  >
                    {t('common.remove')}
                  </button>
                </div>

                <div className="track-controls">
                  <div className="control-group">
                    <label>{t('plots.name')}</label>
                    <input
                      type="text"
                      value={track.name}
                      onChange={(e) =>
                        handleUpdateTrack(track.id, { name: e.target.value })
                      }
                    />
                  </div>

                  <div className="control-group">
                    <label>{t('plots.color')}</label>
                    <input
                      type="color"
                      value={track.color}
                      onChange={(e) =>
                        handleUpdateTrack(track.id, { color: e.target.value })
                      }
                    />
                  </div>

                  {(track.type === 'gc-content' || track.type === 'gc-skew') && (
                    <div className="control-group">
                      <label>
                        {t('plots.windowSize')}: {track.windowSize}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="1000"
                        step="10"
                        value={track.windowSize || 100}
                        onChange={(e) =>
                          handleUpdateTrack(track.id, {
                            windowSize: parseInt(e.target.value)
                          })
                        }
                      />
                    </div>
                  )}

                  {track.type === 'coverage' && (
                    <div className="control-group">
                      <label>{t('plots.baseline')}</label>
                      <input
                        type="number"
                        value={track.baseline || 0}
                        onChange={(e) =>
                          handleUpdateTrack(track.id, {
                            baseline: parseFloat(e.target.value)
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {tracks.length === 0 && (
            <div className="empty-state">
              <p>{t('plots.emptyState')}</p>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>{t('plots.noData')}</p>
        </div>
      )}
    </div>
  );
};
