import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DatasetDetail } from '@shared/parser/types';
import { getDefaultFeatureColor } from '@shared/constants/palette';
import { LayerConfigManager } from '../config/LayerConfigManager';

type LayerVisibility = {
  type: string;
  visible: boolean;
  color: string;
  labelVisible: boolean;
  labelField?: string;
  opacity: number;
};

type LayerConfigPanelProps = {
  dataset: DatasetDetail | null;
  onLayerChange: (layers: LayerVisibility[]) => void;
};

export const LayerConfigPanel = ({
  dataset,
  onLayerChange
}: LayerConfigPanelProps) => {
  const { t } = useTranslation('workspace');
  const [layers, setLayers] = useState<LayerVisibility[]>([]);

  // Extract unique feature types from dataset
  const featureTypes = useMemo(() => {
    if (!dataset?.features) return [];

    const types = new Map<string, number>();
    dataset.features.forEach((feature) => {
      const type = (feature as any).type || 'unknown';
      types.set(type, (types.get(type) || 0) + 1);
    });

    return Array.from(types.entries()).map(([type, count], index) => ({
      type,
      count,
      color: getDefaultFeatureColor(index)
    }));
  }, [dataset]);

  // Initialize layers when dataset changes
  useMemo(() => {
    if (featureTypes.length > 0 && layers.length === 0) {
      const initialLayers: LayerVisibility[] = featureTypes.map((ft, index) => ({
        type: ft.type,
        visible: true,
        color: ft.color,
        labelVisible: ft.count < 20, // Only show labels for features with fewer instances
        labelField: 'name',
        opacity: 0.8
      }));
      setLayers(initialLayers);
      onLayerChange(initialLayers);
    }
  }, [featureTypes.length]);

  const handleVisibilityToggle = (type: string) => {
    const updated = layers.map((layer) =>
      layer.type === type ? { ...layer, visible: !layer.visible } : layer
    );
    setLayers(updated);
    onLayerChange(updated);
  };

  const handleColorChange = (type: string, color: string) => {
    const updated = layers.map((layer) =>
      layer.type === type ? { ...layer, color } : layer
    );
    setLayers(updated);
    onLayerChange(updated);
  };

  const handleOpacityChange = (type: string, opacity: number) => {
    const updated = layers.map((layer) =>
      layer.type === type ? { ...layer, opacity } : layer
    );
    setLayers(updated);
    onLayerChange(updated);
  };

  const handleLabelToggle = (type: string) => {
    const updated = layers.map((layer) =>
      layer.type === type ? { ...layer, labelVisible: !layer.labelVisible } : layer
    );
    setLayers(updated);
    onLayerChange(updated);
  };

  const handleShowAll = () => {
    const updated = layers.map((layer) => ({ ...layer, visible: true }));
    setLayers(updated);
    onLayerChange(updated);
  };

  const handleHideAll = () => {
    const updated = layers.map((layer) => ({ ...layer, visible: false }));
    setLayers(updated);
    onLayerChange(updated);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">🎨</span>
        <div>
          <h3 className="panel-title">{t('layers.title')}</h3>
          <p className="panel-description">
            控制特征图层的显示方式和样式
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleShowAll} className="btn btn-secondary">
            {t('layers.showAll')}
          </button>
          <button onClick={handleHideAll} className="btn btn-secondary">
            {t('layers.hideAll')}
          </button>
        </div>
      </div>

      {/* 配置管理工具栏 */}
      <LayerConfigManager
        currentLayers={layers}
        onApplyConfig={(newLayers) => {
          setLayers(newLayers);
          onLayerChange(newLayers);
        }}
      />

      <ul className="panel-list">
        {layers.map((layer) => {
          const featureType = featureTypes.find((ft) => ft.type === layer.type);
          return (
            <li key={layer.type} className="panel-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => handleVisibilityToggle(layer.type)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 500, color: 'rgba(226, 232, 240, 0.95)', fontSize: '1rem' }}>
                  {layer.type}
                  {featureType && (
                    <span style={{ color: 'rgba(148, 163, 184, 0.8)', marginLeft: '0.5rem' }}>
                      ({featureType.count})
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="control-group">
                  <label className="control-label">{t('layers.color')}</label>
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) => handleColorChange(layer.type, e.target.value)}
                    disabled={!layer.visible}
                    className="control-input"
                    style={{ padding: '0.25rem', height: '40px', cursor: layer.visible ? 'pointer' : 'not-allowed' }}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">
                    {t('layers.opacity')}: {Math.round(layer.opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={layer.opacity}
                    onChange={(e) => handleOpacityChange(layer.type, parseFloat(e.target.value))}
                    disabled={!layer.visible}
                    style={{ cursor: layer.visible ? 'pointer' : 'not-allowed' }}
                  />
                </div>

                <div className="control-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: layer.visible ? 'pointer' : 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={layer.labelVisible}
                      onChange={() => handleLabelToggle(layer.type)}
                      disabled={!layer.visible}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span className="control-label" style={{ margin: 0 }}>{t('layers.showLabels')}</span>
                  </label>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {layers.length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'rgba(148, 163, 184, 0.6)',
          fontSize: '1rem'
        }}>
          <p>{t('layers.noData')}</p>
        </div>
      )}
    </div>
  );
};
