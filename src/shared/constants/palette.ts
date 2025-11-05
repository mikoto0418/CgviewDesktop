export const DEFAULT_FEATURE_COLORS = [
  '#38bdf8',
  '#a855f7',
  '#f97316',
  '#22c55e',
  '#f43f5e',
  '#94a3b8',
  '#10b981',
  '#facc15'
];

export const getDefaultFeatureColor = (index: number): string => {
  if (!Number.isFinite(index) || index < 0) {
    return DEFAULT_FEATURE_COLORS[0];
  }
  return DEFAULT_FEATURE_COLORS[index % DEFAULT_FEATURE_COLORS.length];
};
