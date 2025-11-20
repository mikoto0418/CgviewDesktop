import type { LinkTrack, PlotTrack } from '@shared/domain/visualization';

export type SupportedFormat = 'genbank' | 'gff3' | 'json' | 'csv';

export interface ParserSummary {
  format: SupportedFormat;
  displayName: string;
  description?: string;
}

export interface ParsedDatasetMeta {
  recordCount: number;
  totalLength?: number;
  organism?: string;
}

export interface FeatureState {
  visible: boolean;
  color: string;
}

export type FeatureStateMap = Record<string, FeatureState>;

export interface FeatureTypeStatistic {
  key: string;
  label: string;
  count: number;
}

export interface DatasetStatistics {
  totalFeatures: number;
  featureTypes: FeatureTypeStatistic[];
}

export interface ParsedDataset {
  id: string;
  projectId: string;
  format: SupportedFormat;
  sourcePath: string;
  displayName?: string;
  meta: ParsedDatasetMeta;
  features: Array<Record<string, unknown>>;
  featureStates?: FeatureStateMap;
  plotTracks?: PlotTrack[];
  linkTracks?: LinkTrack[];
  statistics?: DatasetStatistics;
}

export interface FileParseRequest {
  projectId: string;
  filePath: string;
  formatHint?: SupportedFormat;
}

export interface FileParseResult {
  dataset: ParsedDataset;
  warnings?: string[];
}

export interface DatasetSummary {
  id: string;
  projectId: string;
  format: SupportedFormat;
  sourcePath: string;
  displayName: string;
  recordCount: number;
  organism?: string;
  totalLength?: number;
  createdAt: string;
  featureStates?: FeatureStateMap;
  plotTracks?: PlotTrack[];
  linkTracks?: LinkTrack[];
  statistics?: DatasetStatistics;
}

export interface PersistedDataset {
  id: string;
  projectId: string;
  format: SupportedFormat;
  sourcePath: string;
  displayName: string;
  meta: ParsedDatasetMeta;
  features: Array<Record<string, unknown>>;
  createdAt: string;
  featureStates?: FeatureStateMap;
  plotTracks?: PlotTrack[];
  linkTracks?: LinkTrack[];
  statistics?: DatasetStatistics;
}

export interface ParseDatasetResponse {
  dataset: DatasetSummary;
  warnings: string[];
  previewFeatures?: Array<Record<string, unknown>>;
  featureStates?: FeatureStateMap;
  plotTracks?: PlotTrack[];
  linkTracks?: LinkTrack[];
  statistics?: DatasetStatistics;
}

export interface DatasetDetail extends DatasetSummary {
  features: Array<Record<string, unknown>>;
  statistics?: DatasetStatistics;
}

export interface AnnotationParser {
  summary(): ParserSummary;
  canParse(format: SupportedFormat): boolean;
  parse(request: FileParseRequest): Promise<FileParseResult>;
}
