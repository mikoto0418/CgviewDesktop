import type {
  CreateProjectInput,
  ProjectSummary
} from '@shared/domain/project';
import type {
  DatasetSummary,
  PersistedDataset,
  DatasetDetail,
  FeatureStateMap
} from '@shared/parser/types';
import type { PlotTrack, LinkTrack } from '@shared/domain/visualization';

export interface PersistenceAdapter {
  init(): Promise<void>;
  listProjects(): Promise<ProjectSummary[]>;
  getProjectById(id: string): Promise<ProjectSummary | null>;
  createProject(input: CreateProjectInput): Promise<ProjectSummary>;
  updateProject(projectId: string, input: Partial<CreateProjectInput>): Promise<ProjectSummary>;
  deleteProject(projectId: string): Promise<void>;
  getActiveProjectId(): Promise<string | null>;
  setActiveProjectId(projectId: string | null): Promise<void>;
  createDataset(dataset: PersistedDataset): Promise<DatasetSummary>;
  listDatasets(projectId: string): Promise<DatasetSummary[]>;
  getDatasetDetail(datasetId: string): Promise<DatasetDetail | null>;
  updateDatasetDisplayName(datasetId: string, displayName: string): Promise<void>;
  updateDatasetFeatureStates(datasetId: string, featureStates: FeatureStateMap): Promise<void>;
  updateDatasetPlotTracks(datasetId: string, plotTracks: PlotTrack[]): Promise<void>;
  updateDatasetLinkTracks(datasetId: string, linkTracks: LinkTrack[]): Promise<void>;
  deleteDataset(datasetId: string): Promise<void>;
  close(): Promise<void>;
}

export interface MigrationDefinition {
  id: string;
  statements: readonly string[];
}
