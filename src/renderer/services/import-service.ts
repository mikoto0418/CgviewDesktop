import type {
  FileParseRequest,
  ParserSummary,
  ParseDatasetResponse,
  DatasetSummary,
  DatasetDetail,
  FeatureStateMap
} from '@shared/parser/types';
import type { PlotTrack, LinkTrack } from '@shared/domain/visualization';

const ensureBridge = () => {
  if (!window.appBridge) {
    throw new Error('App bridge is not available.');
  }
  return window.appBridge;
};

export const ImportService = {
  async listParsers(): Promise<ParserSummary[]> {
    const bridge = ensureBridge();
    if (!bridge.listParsers) {
      return [];
    }
    return bridge.listParsers();
  },

  async parse(request: FileParseRequest): Promise<ParseDatasetResponse> {
    const bridge = ensureBridge();
    if (!bridge.parseDataset) {
      throw new Error('Parse dataset API is not available.');
    }
    return bridge.parseDataset(request);
  },

  async listDatasets(projectId: string): Promise<DatasetSummary[]> {
    const bridge = ensureBridge();
    if (!bridge.listDatasets) {
      return [];
    }
    return bridge.listDatasets(projectId);
  },

  async getDataset(datasetId: string): Promise<DatasetDetail | null> {
    const bridge = ensureBridge();
    if (!bridge.getDataset) {
      return null;
    }
    return bridge.getDataset(datasetId);
  },

  async deleteDataset(datasetId: string): Promise<void> {
    const bridge = ensureBridge();
    if (!bridge.deleteDataset) {
      throw new Error('Delete dataset API is not available.');
    }
    await bridge.deleteDataset(datasetId);
  },

  async renameDataset(datasetId: string, displayName: string): Promise<string> {
    const bridge = ensureBridge();
    if (!bridge.renameDataset) {
      throw new Error('Rename dataset API is not available.');
    }
    const result = await bridge.renameDataset(datasetId, displayName);
    const trimmed = displayName.trim();
    return result?.displayName?.trim?.() ?? trimmed;
  },

  async updateFeatureStates(
    datasetId: string,
    featureStates: FeatureStateMap
  ): Promise<void> {
    const bridge = ensureBridge();
    if (!bridge.updateFeatureStates) {
      throw new Error('Update feature states API is not available.');
    }
    await bridge.updateFeatureStates(datasetId, featureStates);
  },

  async updatePlotTracks(datasetId: string, plotTracks: PlotTrack[]): Promise<void> {
    const bridge = ensureBridge();
    if (!bridge.updatePlotTracks) {
      throw new Error('Update plot tracks API is not available.');
    }
    await bridge.updatePlotTracks(datasetId, plotTracks);
  },

  async updateLinkTracks(datasetId: string, linkTracks: LinkTrack[]): Promise<void> {
    const bridge = ensureBridge();
    if (!bridge.updateLinkTracks) {
      throw new Error('Update link tracks API is not available.');
    }
    await bridge.updateLinkTracks(datasetId, linkTracks);
  }
};
