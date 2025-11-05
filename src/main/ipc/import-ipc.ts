import type {
  FileParseRequest,
  DatasetSummary,
  FeatureStateMap
} from '@shared/parser/types';
import type { PlotTrack, LinkTrack } from '@shared/domain/visualization';
import { computeDatasetStatistics } from '@shared/domain/dataset-statistics';
import {
  normalizeFeatureStates,
  normalizeLinkTracks,
  normalizePlotTracks
} from '@shared/domain/visualization-normalizers';
import type { PersistenceAdapter } from '../persistence/persistence-adapter';
import { listParsers, parseFile } from '../import';
import { ipcMain } from '../electron-module';

const CHANNELS = {
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

export const registerImportIpc = (persistence: PersistenceAdapter) => {
  ipcMain.handle(CHANNELS.LIST, async () => {
    try {
      const summaries = listParsers();
      return { ok: true as const, data: summaries };
    } catch (error) {
      console.error('[IPC] Failed to list parsers', error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while listing parsers.'
      };
    }
  });

  ipcMain.handle(CHANNELS.PARSE, async (_event, payload: FileParseRequest) => {
    try {
      if (!payload?.projectId || !payload?.filePath) {
        throw new Error('Project id and file path are required.');
      }

      const result = await parseFile(payload);
      const statistics =
        result.dataset.statistics ?? computeDatasetStatistics(result.dataset.features);

      const persisted = await persistence.createDataset({
        id: result.dataset.id,
        projectId: result.dataset.projectId,
        format: result.dataset.format,
        sourcePath: result.dataset.sourcePath,
        meta: result.dataset.meta,
        features: result.dataset.features,
        featureStates: result.dataset.featureStates ?? {},
        plotTracks: result.dataset.plotTracks ?? [],
        linkTracks: result.dataset.linkTracks ?? [],
        statistics,
        createdAt: new Date().toISOString()
      });

      const datasetSummary: DatasetSummary = {
        ...persisted,
        statistics
      };

      return {
        ok: true as const,
        data: {
          dataset: datasetSummary,
          warnings: result.warnings ?? [],
          previewFeatures: result.dataset.features.slice(0, 10),
          featureStates: datasetSummary.featureStates ?? {},
          plotTracks: datasetSummary.plotTracks ?? [],
          linkTracks: datasetSummary.linkTracks ?? [],
          statistics
        }
      };
    } catch (error) {
      console.error('[IPC] Failed to parse dataset', error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while parsing dataset.'
      };
    }
  });

  ipcMain.handle(CHANNELS.DATASETS, async (_event, projectId: string) => {
    try {
      if (!projectId) {
        throw new Error('Project id is required.');
      }
      const datasets = await persistence.listDatasets(projectId);
      return { ok: true as const, data: datasets satisfies DatasetSummary[] };
    } catch (error) {
      console.error('[IPC] Failed to list datasets', error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while listing datasets.'
      };
    }
  });

  ipcMain.handle(
    CHANNELS.DATASET_DETAIL,
    async (_event, datasetId: string) => {
      try {
        if (!datasetId) {
          throw new Error('Dataset id is required.');
        }

        const detail = await persistence.getDatasetDetail(datasetId);
        if (!detail) {
          return { ok: false as const, error: 'Dataset not found.' };
        }

        const statistics =
          detail.statistics ?? computeDatasetStatistics(detail.features);

        return {
          ok: true as const,
          data: {
            ...detail,
            statistics
          }
        };
      } catch (error) {
        console.error('[IPC] Failed to get dataset detail', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while retrieving dataset detail.'
        };
      }
    }
  );

  ipcMain.handle(CHANNELS.DATASET_DELETE, async (_event, datasetId: string) => {
    try {
      if (!datasetId) {
        throw new Error('Dataset id is required.');
      }

      await persistence.deleteDataset(datasetId);
      return { ok: true as const, data: null };
    } catch (error) {
      console.error('[IPC] Failed to delete dataset', error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error occurred while deleting dataset.'
      };
    }
  });

  ipcMain.handle(
    CHANNELS.DATASET_RENAME,
    async (_event, payload: { datasetId: string; displayName: string }) => {
      try {
        if (!payload?.datasetId) {
          throw new Error('Dataset id is required.');
        }

        await persistence.updateDatasetDisplayName(payload.datasetId, payload.displayName ?? '');
        return {
          ok: true as const,
          data: {
            displayName: payload.displayName?.trim() ?? ''
          }
        };
      } catch (error) {
        console.error('[IPC] Failed to rename dataset', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while renaming dataset.'
        };
      }
    }
  );

  ipcMain.handle(
    CHANNELS.DATASET_FEATURE_STATES,
    async (
      _event,
      payload: { datasetId: string; featureStates: FeatureStateMap }
    ) => {
      try {
        const datasetId =
          typeof payload?.datasetId === 'string' ? payload.datasetId.trim() : '';
        if (!datasetId) {
          throw new Error('Dataset id is required.');
        }
        const featureStates = normalizeFeatureStates(payload.featureStates ?? {});
        await persistence.updateDatasetFeatureStates(datasetId, featureStates);
        return {
          ok: true as const,
          data: null
        };
      } catch (error) {
        console.error('[IPC] Failed to update dataset feature states', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while updating dataset feature states.'
        };
      }
    }
  );

  ipcMain.handle(
    CHANNELS.DATASET_PLOT_TRACKS,
    async (
      _event,
      payload: { datasetId: string; plotTracks: PlotTrack[] }
    ) => {
      try {
        const datasetId =
          typeof payload?.datasetId === 'string' ? payload.datasetId.trim() : '';
        if (!datasetId) {
          throw new Error('Dataset id is required.');
        }
        const tracks = normalizePlotTracks(payload.plotTracks ?? []);
        await persistence.updateDatasetPlotTracks(datasetId, tracks);
        return {
          ok: true as const,
          data: null
        };
      } catch (error) {
        console.error('[IPC] Failed to update dataset plot tracks', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while updating dataset plot tracks.'
        };
      }
    }
  );

  ipcMain.handle(
    CHANNELS.DATASET_LINK_TRACKS,
    async (
      _event,
      payload: { datasetId: string; linkTracks: LinkTrack[] }
    ) => {
      try {
        const datasetId =
          typeof payload?.datasetId === 'string' ? payload.datasetId.trim() : '';
        if (!datasetId) {
          throw new Error('Dataset id is required.');
        }
        const tracks = normalizeLinkTracks(payload.linkTracks ?? []);
        await persistence.updateDatasetLinkTracks(datasetId, tracks);
        return {
          ok: true as const,
          data: null
        };
      } catch (error) {
        console.error('[IPC] Failed to update dataset link tracks', error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown error occurred while updating dataset link tracks.'
        };
      }
    }
  );
};

export type ImportIpcChannels = typeof CHANNELS;
