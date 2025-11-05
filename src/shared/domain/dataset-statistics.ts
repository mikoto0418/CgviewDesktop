import type { DatasetStatistics } from '@shared/parser/types';

const FEATURE_TYPE_KEYS = [
  'type',
  'source',
  'feature_type',
  'kind',
  'Type',
  'category'
] as const;

export interface ClassifiedFeatureType {
  key: string;
  label: string;
}

export const classifyFeatureType = (
  feature: Record<string, unknown> | null | undefined
): ClassifiedFeatureType => {
  if (!feature || typeof feature !== 'object') {
    return { key: 'feature', label: 'feature' };
  }

  for (const key of FEATURE_TYPE_KEYS) {
    const rawValue = feature[key];
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed.length > 0) {
        return {
          key: trimmed.toLowerCase(),
          label: trimmed
        };
      }
    }
  }

  return { key: 'feature', label: 'feature' };
};

export const computeDatasetStatistics = (
  features: Array<Record<string, unknown>>
): DatasetStatistics => {
  const featureTypes = new Map<string, { label: string; count: number }>();

  features.forEach((feature) => {
    const { key, label } = classifyFeatureType(feature);
    const existing = featureTypes.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      featureTypes.set(key, { label, count: 1 });
    }
  });

  const sorted = Array.from(featureTypes.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      count: value.count
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });

  return {
    totalFeatures: features.length,
    featureTypes: sorted
  };
};
