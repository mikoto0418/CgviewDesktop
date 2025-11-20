import type {
  CreateProjectInput,
  ProjectSummary
} from '@shared/domain/project';
import type {
  FileParseRequest,
  ParserSummary,
  ParseDatasetResponse,
  DatasetSummary,
  DatasetDetail,
  FeatureStateMap
} from '@shared/parser/types';
import type { PlotTrack, LinkTrack } from '@shared/domain/visualization';

declare module 'svgcanvas' {
  class Context {
    constructor(width: number, height: number);
    getSerializedSvg(includeNamespace?: boolean): string;
  }

  class Element {
    constructor(name: string);
  }

  export { Context, Element };
}

export {};

declare global {
  interface Window {
    appBridge?: {
      version: string;
      platform: NodeJS.Platform;
      selectDirectory: () => Promise<string | null>;
      selectFile: (filters?: Array<{ name: string; extensions: string[] }>) => Promise<string | null>;
      listProjects: () => Promise<ProjectSummary[]>;
      createProject: (input: CreateProjectInput) => Promise<ProjectSummary>;
      updateProject: (projectId: string, input: Partial<CreateProjectInput>) => Promise<ProjectSummary>;
      deleteProject: (projectId: string) => Promise<void>;
      getProject: (projectId: string) => Promise<ProjectSummary | null>;
      getActiveProjectId: () => Promise<string | null>;
      setActiveProjectId: (projectId: string | null) => Promise<void>;
      listParsers: () => Promise<ParserSummary[]>;
      parseDataset: (payload: FileParseRequest) => Promise<ParseDatasetResponse>;
      listDatasets: (projectId: string) => Promise<DatasetSummary[]>;
      getDataset: (datasetId: string) => Promise<DatasetDetail | null>;
      deleteDataset: (datasetId: string) => Promise<void>;
      renameDataset: (
        datasetId: string,
        displayName: string
      ) => Promise<{ displayName: string }>;
      updateFeatureStates: (
        datasetId: string,
        featureStates: FeatureStateMap
      ) => Promise<void>;
      updatePlotTracks: (
        datasetId: string,
        plotTracks: PlotTrack[]
      ) => Promise<void>;
      updateLinkTracks: (
        datasetId: string,
        linkTracks: LinkTrack[]
      ) => Promise<void>;
    };
    SVGContext?: typeof import('svgcanvas').Context;
  }
}
