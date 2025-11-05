import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DatasetDetail } from '@shared/parser/types';

type FilterCriteria = {
  name?: string;
  type?: string;
  minStart?: number;
  maxStop?: number;
  strand?: number;
  containsText?: string;
};

type FeatureFilterPanelProps = {
  dataset: DatasetDetail | null;
  onFilterChange: (filter: FilterCriteria | null) => void;
};

export const FeatureFilterPanel = ({
  dataset,
  onFilterChange
}: FeatureFilterPanelProps) => {
  const { t } = useTranslation('workspace');
  const [filter, setFilter] = useState<FilterCriteria>({});

  // Get unique feature types for dropdown
  const featureTypes = useMemo(() => {
    if (!dataset?.features) return [];

    const types = new Set<string>();
    dataset.features.forEach((feature) => {
      types.add((feature as any).type || 'unknown');
    });

    return Array.from(types.values()).sort();
  }, [dataset]);

  // Get position range for slider
  const positionRange = useMemo(() => {
    if (!dataset?.features || dataset.features.length === 0) {
      return { min: 0, max: 0 };
    }

    let min = Infinity;
    let max = 0;

    dataset.features.forEach((feature) => {
      const start = parseFloat((feature as any).start) || 0;
      const stop = parseFloat((feature as any).stop) || 0;
      min = Math.min(min, start, stop);
      max = Math.max(max, start, stop);
    });

    return { min, max };
  }, [dataset]);

  const handleInputChange = (field: keyof FilterCriteria, value: string | number) => {
    const updated = {
      ...filter,
      [field]: value || undefined
    };
    setFilter(updated);
    onFilterChange(updated);
  };

  const handleStrandChange = (value: string) => {
    const strand = value === 'all' ? undefined : parseInt(value);
    handleInputChange('strand', strand);
  };

  const handleClearFilter = () => {
    setFilter({});
    onFilterChange(null);
  };

  const hasActiveFilter = Object.keys(filter).some(
    (key) => filter[key as keyof FilterCriteria] !== undefined
  );

  // 如果没有数据集，显示提示
  if (!dataset) {
    return (
      <div className="feature-filter-panel">
        <div className="panel-header">
          <h3>🔍 特征筛选</h3>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(148, 163, 184, 0.8)' }}>
          <p>请先导入数据集以进行筛选</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-filter-panel">
      <div className="panel-header">
        <h3>🔍 特征筛选</h3>
        {hasActiveFilter && (
          <button onClick={handleClearFilter} className="btn-secondary">
            清除筛选
          </button>
        )}
      </div>

      <div className="filter-form">
        <div className="form-group">
          <label htmlFor="filter-name">{t('filters.name')}</label>
          <input
            id="filter-name"
            type="text"
            placeholder={t('filters.namePlaceholder')}
            value={filter.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="filter-type">{t('filters.type')}</label>
          <select
            id="filter-type"
            value={filter.type || ''}
            onChange={(e) => handleInputChange('type', e.target.value)}
          >
            <option value="">{t('filters.allTypes')}</option>
            {featureTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="filter-text">{t('filters.contains')}</label>
          <input
            id="filter-text"
            type="text"
            placeholder={t('filters.containsPlaceholder')}
            value={filter.containsText || ''}
            onChange={(e) => handleInputChange('containsText', e.target.value)}
          />
        </div>

        {positionRange.max > 0 && (
          <>
            <div className="form-group">
              <label htmlFor="filter-min-start">
                {t('filters.minPosition')}: {filter.minStart || positionRange.min}
              </label>
              <input
                id="filter-min-start"
                type="range"
                min={positionRange.min}
                max={positionRange.max}
                value={filter.minStart || positionRange.min}
                onChange={(e) => handleInputChange('minStart', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="filter-max-stop">
                {t('filters.maxPosition')}: {filter.maxStop || positionRange.max}
              </label>
              <input
                id="filter-max-stop"
                type="range"
                min={positionRange.min}
                max={positionRange.max}
                value={filter.maxStop || positionRange.max}
                onChange={(e) => handleInputChange('maxStop', parseInt(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="filter-strand">{t('filters.strand')}</label>
          <select
            id="filter-strand"
            value={filter.strand === undefined ? 'all' : filter.strand.toString()}
            onChange={(e) => handleStrandChange(e.target.value)}
          >
            <option value="all">{t('filters.allStrands')}</option>
            <option value="1">{t('filters.forward')}</option>
            <option value="-1">{t('filters.reverse')}</option>
          </select>
        </div>
      </div>

      {hasActiveFilter && (
        <div className="active-filters">
          <h4>{t('filters.activeFilters')}</h4>
          <div className="filter-tags">
            {filter.name && (
              <span className="filter-tag">
                {t('filters.name')}: {filter.name}
                <button onClick={() => handleInputChange('name', '')}>×</button>
              </span>
            )}
            {filter.type && (
              <span className="filter-tag">
                {t('filters.type')}: {filter.type}
                <button onClick={() => handleInputChange('type', '')}>×</button>
              </span>
            )}
            {filter.containsText && (
              <span className="filter-tag">
                {t('filters.contains')}: {filter.containsText}
                <button onClick={() => handleInputChange('containsText', '')}>×</button>
              </span>
            )}
            {filter.minStart !== undefined && (
              <span className="filter-tag">
                {t('filters.minPosition')}: {filter.minStart}
                <button onClick={() => handleInputChange('minStart', '')}>×</button>
              </span>
            )}
            {filter.maxStop !== undefined && (
              <span className="filter-tag">
                {t('filters.maxPosition')}: {filter.maxStop}
                <button onClick={() => handleInputChange('maxStop', '')}>×</button>
              </span>
            )}
            {filter.strand !== undefined && (
              <span className="filter-tag">
                {t('filters.strand')}: {filter.strand === 1 ? t('filters.forward') : t('filters.reverse')}
                <button onClick={() => handleInputChange('strand', '')}>×</button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
