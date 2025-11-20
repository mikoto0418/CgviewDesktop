import { useState, useMemo, useEffect } from 'react';
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

const normalizeFeatureType = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : 'unknown';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => normalizeFeatureType(item))
      .filter((item) => item !== 'unknown')
      .join(', ');
    return joined.length > 0 ? joined : 'unknown';
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidate =
      record.name ??
      record.type ??
      record.id ??
      record.key ??
      record.label;
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return 'unknown';
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
      const type = normalizeFeatureType((feature as any).type);
      types.set(type, (types.get(type) || 0) + 1);
    });

    return Array.from(types.entries()).map(([type, count], index) => ({
      type,
      count,
      color: getDefaultFeatureColor(index)
    }));
  }, [dataset]);

  // Initialize layers when dataset changes
  useEffect(() => {
    console.log('[LayerConfigPanel] Initializing layers for featureTypes:', featureTypes);
    if (featureTypes.length > 0) {
      const initialLayers: LayerVisibility[] = featureTypes.map((ft) => ({
        type: ft.type,
        visible: true,
        color: ft.color,
        labelVisible: ft.count < 20,
        labelField: 'name',
        opacity: 0.8
      }));
      console.log('[LayerConfigPanel] Setting initial layers:', initialLayers);
      setLayers(initialLayers);
      onLayerChange(initialLayers);
    } else {
      console.log('[LayerConfigPanel] No feature types found, clearing layers');
      setLayers([]);
      onLayerChange([]);
    }
  }, [dataset?.id, featureTypes.length, onLayerChange]);
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

  // 如果没有数据集，显示提示
  if (!dataset) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-icon">🎨</span>
          <h3 className="panel-title">{t('layers.title')}</h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.8)' }}>
          <p>请先导入数据集以配置图层</p>
        </div>
      </div>
    );
  }

  // 如果没有特征类型，显示提示
  if (featureTypes.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-icon">🎨</span>
          <h3 className="panel-title">{t('layers.title')}</h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.8)' }}>
          <p>数据集中没有找到特征数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel animate-fade-in">
      <div className="panel-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="panel-icon">🎨</span>
            <h3 className="panel-title">{t('layers.title')}</h3>
          </div>
          <p className="panel-description">
            控制特征图层的显示方式和样式
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleShowAll} className="btn-secondary">
            {t('layers.showAll')}
          </button>
          <button onClick={handleHideAll} className="btn-secondary">
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => handleVisibilityToggle(layer.type)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--system-blue)' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--system-text-primary)' }}>
                    {layer.type}
                    {featureType && (
                      <span style={{ color: 'var(--system-text-tertiary)', marginLeft: '6px', fontWeight: 400, fontSize: '13px' }}>
                        ({featureType.count})
                      </span>
                    )}
                  </span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: layer.visible ? 'pointer' : 'not-allowed', opacity: layer.visible ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    checked={layer.labelVisible}
                    onChange={() => handleLabelToggle(layer.type)}
                    disabled={!layer.visible}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--system-text-secondary)' }}>{t('layers.showLabels')}</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="control-group">
                  <label className="control-label">{t('layers.color')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={layer.color}
                      onChange={(e) => handleColorChange(layer.type, e.target.value)}
                      disabled={!layer.visible}
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        padding: 0, 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: layer.visible ? 'pointer' : 'not-allowed',
                        background: 'none'
                      }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--system-text-secondary)', fontFamily: 'monospace' }}>
                      {layer.color.toUpperCase()}
                    </span>
                  </div>
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
                    style={{ 
                      width: '100%', 
                      cursor: layer.visible ? 'pointer' : 'not-allowed',
                      accentColor: 'var(--system-blue)'
                    }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {layers.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--system-text-tertiary)',
          background: 'var(--system-background-secondary)',
          borderRadius: '12px',
          border: '1px dashed var(--system-divider)'
        }}>
          <p>{t('layers.noData')}</p>
        </div>
      )}
    </div>
  );
};
