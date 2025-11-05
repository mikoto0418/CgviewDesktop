import electronRenderer from 'electron/renderer';
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

type FileFilter = { name: string; extensions: string[] };
type IpcSuccess<T> = { ok: true; data: T };
type IpcError = { ok: false; error?: string };
type IpcResponse<T> = IpcSuccess<T> | IpcError;

const { contextBridge, ipcRenderer } = electronRenderer;

const PROJECT_CHANNELS = {
  LIST: 'projects:list',
  CREATE: 'projects:create',
  GET: 'projects:get',
  GET_ACTIVE: 'projects:getActive',
  SET_ACTIVE: 'projects:setActive'
} as const;

const IMPORT_CHANNELS = {
  LIST: 'parsers:list',
  PARSE: 'datasets:parse',
  DATASETS: 'datasets:list',
  DATASET_DETAIL: 'datasets:get',
  DATASET_DELETE: 'datasets:delete',
  DATASET_RENAME: 'datasets:rename',
  DATASET_FEATURE_STATES: 'datasets:updateFeatureStates',
  DATASET_PLOT_TRACKS: 'datasets:updatePlotTracks',
  DATASET_LINK_TRACKS: 'datasets:updateLinkTracks'
} as const;

const invoke = async <T, Payload = unknown>(
  channel: string,
  payload?: Payload
): Promise<T> => {
  const response = (await ipcRenderer.invoke(
    channel,
    payload
  )) as IpcResponse<T>;

  if (response?.ok) {
    return response.data;
  }

  const message =
    response?.error ?? 'Unknown error occurred while communicating with main.';
  throw new Error(message);
};

try {
  console.info(
    '[preload] initializing bridge',
    process.versions?.electron,
    process.platform
  );

  if (typeof contextBridge?.exposeInMainWorld !== 'function') {
    console.error('[preload] contextBridge.exposeInMainWorld is not available.');
  } else {
    contextBridge.exposeInMainWorld('appBridge', {
      version: process.versions.electron,
      platform: process.platform,
      selectDirectory: () =>
        ipcRenderer.invoke('dialog:selectDirectory'),
      selectFile: (filters?: FileFilter[]) =>
        ipcRenderer.invoke('dialog:selectFile', filters ?? []),
      listProjects: () => invoke<ProjectSummary[]>(PROJECT_CHANNELS.LIST),
      createProject: (input: CreateProjectInput) =>
        invoke<ProjectSummary, CreateProjectInput>(PROJECT_CHANNELS.CREATE, input),
      getProject: (projectId: string) =>
        invoke<ProjectSummary | null, string>(PROJECT_CHANNELS.GET, projectId),
      getActiveProjectId: () =>
        invoke<string | null>(PROJECT_CHANNELS.GET_ACTIVE),
      setActiveProjectId: (projectId: string | null) =>
        invoke<void, string | null>(PROJECT_CHANNELS.SET_ACTIVE, projectId),
      listParsers: () => invoke<ParserSummary[]>(IMPORT_CHANNELS.LIST),
      parseDataset: (payload: FileParseRequest) =>
        invoke<ParseDatasetResponse, FileParseRequest>(IMPORT_CHANNELS.PARSE, payload),
      listDatasets: (projectId: string) =>
        invoke<DatasetSummary[], string>(IMPORT_CHANNELS.DATASETS, projectId),
      getDataset: (datasetId: string) =>
        invoke<DatasetDetail | null, string>(IMPORT_CHANNELS.DATASET_DETAIL, datasetId),
      deleteDataset: (datasetId: string) =>
        invoke<void, string>(IMPORT_CHANNELS.DATASET_DELETE, datasetId),
      renameDataset: (datasetId: string, displayName: string) =>
        invoke<{ displayName: string }, { datasetId: string; displayName: string }>(
          IMPORT_CHANNELS.DATASET_RENAME,
          { datasetId, displayName }
        ),
      updateFeatureStates: (datasetId: string, featureStates: FeatureStateMap) =>
        invoke<void, { datasetId: string; featureStates: FeatureStateMap }>(
          IMPORT_CHANNELS.DATASET_FEATURE_STATES,
          { datasetId, featureStates }
        ),
      updatePlotTracks: (datasetId: string, plotTracks: PlotTrack[]) =>
        invoke<void, { datasetId: string; plotTracks: PlotTrack[] }>(
          IMPORT_CHANNELS.DATASET_PLOT_TRACKS,
          { datasetId, plotTracks }
        ),
      updateLinkTracks: (datasetId: string, linkTracks: LinkTrack[]) =>
        invoke<void, { datasetId: string; linkTracks: LinkTrack[] }>(
          IMPORT_CHANNELS.DATASET_LINK_TRACKS,
          { datasetId, linkTracks }
        )
    });
    console.info('[preload] appBridge exposed.');
  }
} catch (error) {
  console.error('[preload] Failed to expose appBridge', error);
}
