import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectSummary } from "@shared/domain/project";
import type {
  DatasetSummary,
  DatasetDetail,
  ParseDatasetResponse,
  FeatureStateMap,
  FeatureTypeStatistic
} from "@shared/parser/types";
import type { PlotTrack, LinkTrack } from "@shared/domain/visualization";
import { getDefaultFeatureColor } from "@shared/constants/palette";
import {
  isValidHexColor,
  normalizeLinkTracks,
  normalizePlotTracks
} from "@shared/domain/visualization-normalizers";
import { DataImportWizard } from "../import/DataImportWizard";
import { CgviewViewer } from "@renderer/components/CgviewViewer";
import { ImportService } from "@renderer/services/import-service";

interface WorkspaceViewProps {
  project: ProjectSummary | null;
  onExit: () => void;
}

const PREVIEW_FEATURES = 5;
const MAX_VIEWER_FEATURES = 1500;
const numberFormatter = new Intl.NumberFormat();
type FeatureTypeStat = FeatureTypeStatistic;

const deriveDisplayNameFallback = (path: string) => {
  if (!path) {
    return "";
  }
  const segments = path.split(/[/\\]/);
  return segments[segments.length - 1] || path;
};

export const WorkspaceView = ({ project, onExit }: WorkspaceViewProps) => {
  const { t } = useTranslation(["workspace", "projects", "import", "common"]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDatasetDetail, setSelectedDatasetDetail] = useState<DatasetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [featureFilter, setFeatureFilter] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [featureState, setFeatureState] = useState<FeatureStateMap>({});
  const [featureStateDatasetId, setFeatureStateDatasetId] = useState<string | null>(null);
  const [featureStateSaving, setFeatureStateSaving] = useState(false);
  const [plotStateSaving, setPlotStateSaving] = useState(false);
  const [plotTracks, setPlotTracks] = useState<PlotTrack[]>([]);
  const [plotTracksDatasetId, setPlotTracksDatasetId] = useState<string | null>(null);
  const [linkStateSaving, setLinkStateSaving] = useState(false);
  const [linkTracks, setLinkTracks] = useState<LinkTrack[]>([]);
  const [linkTracksDatasetId, setLinkTracksDatasetId] = useState<string | null>(null);

  const meta = useMemo(() => {
    if (!project) {
      return null;
    }
    return {
      createdAt: new Date(project.createdAt).toLocaleString(),
      updatedAt: new Date(project.updatedAt).toLocaleString()
    };
  }, [project]);

  const unknownTypeLabel = t("workspace:featureControls.unknownType");

  const normalizePlotTracksForState = useCallback(
    (tracks: PlotTrack[] | undefined): PlotTrack[] =>
      normalizePlotTracks(tracks ?? []),
    []
  );

  const normalizeLinkTracksForState = useCallback(
    (tracks: LinkTrack[] | undefined): LinkTrack[] =>
      normalizeLinkTracks(tracks ?? []),
    []
  );

  const resolveFeatureType = useCallback(
    (feature: Record<string, unknown>) => {
      if (!feature) {
        return { key: "feature", label: unknownTypeLabel };
      }
      const record = feature as Record<string, unknown>;
      const raw =
        ["type", "source", "feature_type", "kind", "Type", "category"]
          .map((key) => {
            const value = record[key];
            return typeof value === "string" && value.trim().length > 0
              ? value.trim()
              : null;
          })
          .find((value) => value !== null) ?? null;
      const label = raw ?? unknownTypeLabel;
      const key = label.toLowerCase();
      return { key, label };
    },
    [unknownTypeLabel]
  );

  const featureTypeStats = useMemo<FeatureTypeStat[]>(() => {
    if (selectedDatasetDetail?.statistics?.featureTypes?.length) {
      return selectedDatasetDetail.statistics.featureTypes;
    }
    if (!selectedDatasetDetail) {
      return [];
    }
    const stats = new Map<string, FeatureTypeStat>();
    for (const feature of selectedDatasetDetail.features) {
      const { key, label } = resolveFeatureType(feature);
      const existing = stats.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        stats.set(key, { key, label, count: 1 });
      }
    }
    return Array.from(stats.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });
  }, [resolveFeatureType, selectedDatasetDetail]);
  useEffect(() => {
    if (!selectedDatasetDetail) {
      setFeatureStateDatasetId(null);
      setFeatureState({});
      return;
    }

    if (featureStateDatasetId !== selectedDatasetDetail.id) {
      const persisted = selectedDatasetDetail.featureStates ?? {};
      const next: FeatureStateMap = {};
      featureTypeStats.forEach((stat, index) => {
        const fallbackColor = getDefaultFeatureColor(index);
        const persistedState = persisted[stat.key];
        next[stat.key] = {
          visible: persistedState?.visible ?? true,
          color: persistedState?.color ?? fallbackColor
        };
      });
      setFeatureState(next);
      setFeatureStateDatasetId(selectedDatasetDetail.id);
    }
  }, [featureStateDatasetId, featureTypeStats, selectedDatasetDetail]);

  useEffect(() => {
    if (!selectedDatasetDetail) {
      setPlotTracksDatasetId(null);
      setPlotTracks([]);
      return;
    }

    if (plotTracksDatasetId !== selectedDatasetDetail.id) {
      const normalized = normalizePlotTracksForState(selectedDatasetDetail.plotTracks);
      setPlotTracks(normalized);
      setPlotTracksDatasetId(selectedDatasetDetail.id);
      setPlotStateSaving(false);
    }
  }, [normalizePlotTracksForState, plotTracksDatasetId, selectedDatasetDetail]);

  useEffect(() => {
    if (!selectedDatasetDetail) {
      setLinkTracksDatasetId(null);
      setLinkTracks([]);
      return;
    }

    if (linkTracksDatasetId !== selectedDatasetDetail.id) {
      const normalized = normalizeLinkTracksForState(selectedDatasetDetail.linkTracks);
      setLinkTracks(normalized);
      setLinkTracksDatasetId(selectedDatasetDetail.id);
      setLinkStateSaving(false);
    }
  }, [linkTracksDatasetId, normalizeLinkTracksForState, selectedDatasetDetail]);

  useEffect(() => {
    if (
      !selectedDatasetDetail ||
      !featureStateDatasetId ||
      featureStateDatasetId !== selectedDatasetDetail.id
    ) {
      return;
    }

    const persisted = selectedDatasetDetail.featureStates ?? {};
    setFeatureState((prev) => {
      let changed = false;
      const next: FeatureStateMap = { ...prev };

      featureTypeStats.forEach((stat, index) => {
        if (!next[stat.key]) {
          const fallbackColor = getDefaultFeatureColor(index);
          const persistedState = persisted[stat.key];
          next[stat.key] = {
            visible: persistedState?.visible ?? true,
            color: persistedState?.color ?? fallbackColor
          };
          changed = true;
        }
      });

      const allowedKeys = new Set(featureTypeStats.map((stat) => stat.key));
      Object.keys(next).forEach((key) => {
        if (!allowedKeys.has(key)) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [featureStateDatasetId, featureTypeStats, selectedDatasetDetail]);

  const persistFeatureStates = useCallback(
    async (nextState: FeatureStateMap, fallbackState: FeatureStateMap) => {
      if (!selectedDatasetDetail) {
        return;
      }

      setFeatureStateSaving(true);
      try {
        await ImportService.updateFeatureStates(selectedDatasetDetail.id, nextState);
        setSelectedDatasetDetail((prev) =>
          prev && prev.id === selectedDatasetDetail.id
            ? { ...prev, featureStates: nextState }
            : prev
        );
        setDetailError(null);
      } catch (error) {
        console.error(error);
        setDetailError(t("workspace:featureControls.saveFailed"));
        setFeatureState(fallbackState);
      } finally {
        setFeatureStateSaving(false);
      }
    },
    [selectedDatasetDetail, setSelectedDatasetDetail, t]
  );

  const refreshDatasets = useCallback(async () => {
    if (!project) {
      setDatasets([]);
      setSelectedDatasetId(null);
      setSelectedDatasetDetail(null);
      return;
    }

    setDatasetsLoading(true);
    try {
      const list = await ImportService.listDatasets(project.id);
      setDatasets(list);
      setDatasetsError(null);
    } catch (error) {
      console.error(error);
      setDatasetsError(t("workspace:datasets.loadFailed"));
    } finally {
      setDatasetsLoading(false);
    }
  }, [project, t]);

  useEffect(() => {
    refreshDatasets();
  }, [refreshDatasets]);

  const handleImported = useCallback(
    (response: ParseDatasetResponse) => {
      const dataset = response.dataset;
      const importedFeatureStates = (response.featureStates ?? dataset.featureStates ?? {}) as FeatureStateMap;
      const importedPlotTracks = normalizePlotTracksForState(
        response.plotTracks ?? dataset.plotTracks ?? []
      );
      const importedLinkTracks = normalizeLinkTracksForState(
        response.linkTracks ?? dataset.linkTracks ?? []
      );
      const importedStatistics = response.statistics ?? dataset.statistics;

      const mergedDataset: DatasetSummary = {
        ...dataset,
        featureStates: importedFeatureStates,
        plotTracks: importedPlotTracks,
        linkTracks: importedLinkTracks,
        statistics: importedStatistics
      };

      setDatasets((prev) => [mergedDataset, ...prev.filter((item) => item.id !== dataset.id)]);
      setSelectedDatasetId(dataset.id);
      setSelectedDatasetDetail({
        ...mergedDataset,
        featureStates: importedFeatureStates,
        plotTracks: importedPlotTracks,
        linkTracks: importedLinkTracks,
        features: response.previewFeatures ?? [],
        statistics: importedStatistics
      });
      setPlotTracks(importedPlotTracks);
      setPlotTracksDatasetId(dataset.id);
      setLinkTracks(importedLinkTracks);
      setLinkTracksDatasetId(dataset.id);
      setLinkStateSaving(false);
      setDatasetsError(null);
      setDetailError(null);
      setDeletePending(false);
      setFeatureFilter("");
    },
    [normalizeLinkTracksForState, normalizePlotTracksForState]
  );

  useEffect(() => {
    if (!project || datasets.length === 0) {
      setSelectedDatasetId(null);
      setSelectedDatasetDetail(null);
      setFeatureFilter("");
      return;
    }

    if (!selectedDatasetId || !datasets.some((item) => item.id === selectedDatasetId)) {
      setSelectedDatasetId(datasets[0].id);
      setFeatureFilter("");
    }
  }, [datasets, project, selectedDatasetId]);

  const defaultDisplayName = useMemo(() => {
    if (!selectedDatasetDetail) {
      return "";
    }
    const raw = selectedDatasetDetail.displayName?.trim();
    if (raw && raw.length > 0) {
      return raw;
    }
    return deriveDisplayNameFallback(selectedDatasetDetail.sourcePath ?? "");
  }, [selectedDatasetDetail]);

  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedDatasetId) {
        setSelectedDatasetDetail(null);
        return;
      }

      setDetailLoading(true);
      try {
        const detail = await ImportService.getDataset(selectedDatasetId);
        if (detail) {
          setSelectedDatasetDetail(detail);
          setDetailError(null);
        } else {
          setSelectedDatasetDetail(null);
          setDetailError(t("workspace:datasets.detailEmpty"));
        }
      } catch (error) {
        console.error(error);
        setDetailError(t("workspace:datasets.loadFailed"));
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetail();
  }, [selectedDatasetId, t]);

  useEffect(() => {
    if (selectedDatasetDetail) {
      setDisplayNameInput(defaultDisplayName);
    } else {
      setDisplayNameInput("");
    }
    setRenamePending(false);
  }, [defaultDisplayName, selectedDatasetDetail]);

  const totalFeatureCount =
    selectedDatasetDetail?.statistics?.totalFeatures ??
    (typeof selectedDatasetDetail?.recordCount === "number" &&
    selectedDatasetDetail.recordCount > 0
      ? selectedDatasetDetail.recordCount
      : selectedDatasetDetail?.features.length ?? 0);
  const normalizedDisplayNameInput = displayNameInput.trim();
  const renameDisabled =
    !selectedDatasetDetail ||
    renamePending ||
    normalizedDisplayNameInput === defaultDisplayName;
  const canResetDisplayName = normalizedDisplayNameInput !== defaultDisplayName;

  const handleDeleteDataset = useCallback(async () => {
    if (!selectedDatasetId) {
      return;
    }

    if (!window.confirm(t('workspace:datasets.deleteConfirm'))) {
      return;
    }

    setDeletePending(true);
    try {
      await ImportService.deleteDataset(selectedDatasetId);

      const remaining = datasets.filter((item) => item.id !== selectedDatasetId);
      setDatasets(remaining);
      setDatasetsError(null);
      setDetailError(null);
      setSelectedDatasetDetail(null);
      setFeatureFilter("");
      if (remaining.length > 0) {
        setSelectedDatasetId(remaining[0].id);
      } else {
        setSelectedDatasetId(null);
      }
    } catch (error) {
      console.error(error);
      setDetailError(t('workspace:datasets.deleteFailed'));
    } finally {
      setDeletePending(false);
    }
  }, [datasets, selectedDatasetId, t]);

  const handleRenameSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (renameDisabled || !selectedDatasetDetail) {
        return;
      }

      const datasetId = selectedDatasetDetail.id;
      const sourcePath = selectedDatasetDetail.sourcePath ?? '';

      setRenamePending(true);
      try {
        const responseName = await ImportService.renameDataset(datasetId, displayNameInput);
        const trimmed = responseName.trim();
        const effectiveName =
          trimmed.length > 0 ? trimmed : deriveDisplayNameFallback(sourcePath);

        setDatasets((prev) =>
          prev.map((item) =>
            item.id === datasetId ? { ...item, displayName: effectiveName } : item
          )
        );
        setSelectedDatasetDetail((prev) =>
          prev ? { ...prev, displayName: effectiveName } : prev
        );
        setDisplayNameInput(effectiveName);
        setDetailError(null);
      } catch (error) {
        console.error(error);
        setDetailError(t('workspace:datasets.renameFailed'));
      } finally {
        setRenamePending(false);
      }
    },
    [displayNameInput, renameDisabled, selectedDatasetDetail, t]
  );

  const handleRenameReset = useCallback(() => {
    setDisplayNameInput(defaultDisplayName);
    setDetailError(null);
  }, [defaultDisplayName]);

  const featureControlList = useMemo(() => {
    return featureTypeStats.map((stat, index) => {
      const control = featureState[stat.key];
      return {
        ...stat,
        visible: control?.visible ?? true,
        color: control?.color ?? getDefaultFeatureColor(index)
      };
    });
  }, [featureState, featureTypeStats]);

  const hiddenFeatureCount = useMemo(
    () =>
      featureControlList.reduce(
        (total, item) => (item.visible ? total : total + item.count),
        0
      ),
    [featureControlList]
  );

  const normalizedPersistedPlotTracks = useMemo(
    () => normalizePlotTracksForState(selectedDatasetDetail?.plotTracks),
    [normalizePlotTracksForState, selectedDatasetDetail]
  );

  const normalizedPersistedLinkTracks = useMemo(
    () => normalizeLinkTracksForState(selectedDatasetDetail?.linkTracks),
    [normalizeLinkTracksForState, selectedDatasetDetail]
  );

  const plotKindLabels = useMemo(
    () => ({
      "gc-content": t("workspace:plotControls.kinds.gcContent"),
      "gc-skew": t("workspace:plotControls.kinds.gcSkew"),
      coverage: t("workspace:plotControls.kinds.coverage"),
      custom: t("workspace:plotControls.kinds.custom")
    }),
    [t]
  );

  const linkKindLabels = useMemo(
    () => ({
      alignment: t("workspace:linkControls.kinds.alignment"),
      synteny: t("workspace:linkControls.kinds.synteny"),
      custom: t("workspace:linkControls.kinds.custom")
    }),
    [t]
  );

  const plotControlList = useMemo(() => {
    return plotTracks.map((track, index) => {
      const kind = track.kind ?? "custom";
      const name =
        track.name && track.name.trim().length > 0
          ? track.name
          : t("workspace:plotControls.fallbackName", { index: index + 1 });
      return {
        id: track.id ?? `plot-${index + 1}`,
        name,
        kind,
        kindLabel: plotKindLabels[kind as PlotTrack["kind"]] ?? kind,
        color: track.color,
        visible: track.visible !== false
      };
    });
  }, [plotKindLabels, plotTracks, t]);

  const linkControlList = useMemo(() => {
    return linkTracks.map((track, index) => {
      const name =
        track.name && track.name.trim().length > 0
          ? track.name
          : t("workspace:linkControls.fallbackName", { index: index + 1 });
      const kind = track.kind ?? "custom";
      return {
        id: track.id ?? `link-${index + 1}`,
        name,
        kind,
        kindLabel: linkKindLabels[kind as LinkTrack["kind"]] ?? kind,
        color: track.color,
        visible: track.visible !== false,
        connectionCount: Array.isArray(track.connections) ? track.connections.length : 0
      };
    });
  }, [linkKindLabels, linkTracks, t]);

  const plotControlsDirty = useMemo(() => {
    if (!selectedDatasetDetail) {
      return false;
    }
    if (plotTracks.length !== normalizedPersistedPlotTracks.length) {
      return true;
    }
    return plotTracks.some((track, index) => {
      const original = normalizedPersistedPlotTracks[index];
      if (!original) {
        return true;
      }
      return (
        track.visible !== original.visible ||
        track.color !== original.color ||
        track.baseline !== original.baseline ||
        track.axisMin !== original.axisMin ||
        track.axisMax !== original.axisMax ||
        track.thicknessRatio !== original.thicknessRatio
      );
    });
  }, [normalizedPersistedPlotTracks, plotTracks, selectedDatasetDetail]);

  const linkControlsDirty = useMemo(() => {
    if (!selectedDatasetDetail) {
      return false;
    }
    if (linkTracks.length !== normalizedPersistedLinkTracks.length) {
      return true;
    }
    return linkTracks.some((track, index) => {
      const original = normalizedPersistedLinkTracks[index];
      if (!original) {
        return true;
      }
      return (
        track.visible !== original.visible ||
        track.color !== original.color ||
        track.thicknessRatio !== original.thicknessRatio
      );
    });
  }, [linkTracks, normalizedPersistedLinkTracks, selectedDatasetDetail]);


  const filteredFeatures = useMemo(() => {
    if (!selectedDatasetDetail) {
      return [] as Array<Record<string, unknown>>;
    }
    const keyword = featureFilter.trim().toLowerCase();
    return selectedDatasetDetail.features.filter((feature) => {
      const { key } = resolveFeatureType(feature);
      const control = featureState[key];
      if (control && !control.visible) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      try {
        return JSON.stringify(feature).toLowerCase().includes(keyword);
      } catch {
        return false;
      }
    });
  }, [featureFilter, featureState, resolveFeatureType, selectedDatasetDetail]);

  const previewFeatures = useMemo(() => {
    if (filteredFeatures.length === 0) {
      return [] as Array<Record<string, unknown>>;
    }
    return filteredFeatures.slice(0, PREVIEW_FEATURES);
  }, [filteredFeatures]);

  const viewerDataset = useMemo(() => {
    if (!selectedDatasetDetail) {
      return null;
    }

    const featuresWithColor = filteredFeatures.map((feature) => {
      const { key } = resolveFeatureType(feature);
      const color = featureState[key]?.color;
      if (color && (feature as Record<string, unknown>).color !== color) {
        return { ...feature, color };
      }
      return feature;
    });

    if (featuresWithColor.length <= MAX_VIEWER_FEATURES) {
      return {
        ...selectedDatasetDetail,
        features: featuresWithColor,
        plotTracks,
        linkTracks
      };
    }

    return {
      ...selectedDatasetDetail,
      features: featuresWithColor.slice(0, MAX_VIEWER_FEATURES),
      plotTracks,
      linkTracks
    } as DatasetDetail;
  }, [
    filteredFeatures,
    featureState,
    linkTracks,
    plotTracks,
    resolveFeatureType,
    selectedDatasetDetail
  ]);

  const viewerTruncated = filteredFeatures.length > MAX_VIEWER_FEATURES;
  const viewerStats = useMemo(() => {
    if (!selectedDatasetDetail) {
      return null;
    }
    const totalFeatures =
      typeof selectedDatasetDetail.recordCount === 'number'
        ? selectedDatasetDetail.recordCount
        : selectedDatasetDetail.features.length;
    const filteredCount = filteredFeatures.length;
    const totalLength =
      typeof selectedDatasetDetail.totalLength === 'number'
        ? selectedDatasetDetail.totalLength
        : null;
    const truncatedCount = viewerTruncated ? filteredCount - MAX_VIEWER_FEATURES : 0;
    return {
      totalFeatures,
      filteredCount,
      totalLength,
      truncatedCount
    };
  }, [filteredFeatures, selectedDatasetDetail, viewerTruncated]);

  const handleToggleFeatureVisibility = useCallback(
    (typeKey: string) => {
      if (!selectedDatasetDetail || featureStateSaving) {
        return;
      }

      setFeatureState((prev) => {
        const fallbackIndex = featureTypeStats.findIndex((item) => item.key === typeKey);
        const persistedState = selectedDatasetDetail.featureStates?.[typeKey];
        const fallbackColor = getDefaultFeatureColor(
          fallbackIndex >= 0 ? fallbackIndex : 0
        );
        const current = prev[typeKey] ?? persistedState;
        const nextVisible = !(current?.visible ?? true);
        const nextColor = current?.color ?? persistedState?.color ?? fallbackColor;
        const nextState: FeatureStateMap = {
          ...prev,
          [typeKey]: {
            color: nextColor,
            visible: nextVisible
          }
        };
        void persistFeatureStates(nextState, prev);
        return nextState;
      });
    },
    [featureStateSaving, featureTypeStats, persistFeatureStates, selectedDatasetDetail]
  );

  const handleUpdateFeatureColor = useCallback(
    (typeKey: string, color: string) => {
      if (!selectedDatasetDetail || featureStateSaving || !isValidHexColor(color)) {
        return;
      }
      setFeatureState((prev) => {
        const fallbackIndex = featureTypeStats.findIndex((item) => item.key === typeKey);
        const persistedState = selectedDatasetDetail.featureStates?.[typeKey];
        const fallbackColor = getDefaultFeatureColor(
          fallbackIndex >= 0 ? fallbackIndex : 0
        );
        const nextColor = color || persistedState?.color || fallbackColor;
        const nextVisible = prev[typeKey]?.visible ?? persistedState?.visible ?? true;
        if (prev[typeKey]?.color === nextColor) {
          return prev;
        }
        const nextState: FeatureStateMap = {
          ...prev,
          [typeKey]: {
            color: nextColor,
            visible: nextVisible
          }
        };
        void persistFeatureStates(nextState, prev);
        return nextState;
      });
    },
    [featureStateSaving, featureTypeStats, persistFeatureStates, selectedDatasetDetail]
  );

  const handleResetFeatureControls = useCallback(() => {
    if (!selectedDatasetDetail || featureStateSaving) {
      return;
    }

    const next: FeatureStateMap = {};
    featureTypeStats.forEach((stat, index) => {
      const persistedState = selectedDatasetDetail.featureStates?.[stat.key];
      next[stat.key] = {
        visible: persistedState?.visible ?? true,
        color: persistedState?.color ?? getDefaultFeatureColor(index)
      };
    });

    setFeatureState((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const isSame =
        prevKeys.length === nextKeys.length &&
        prevKeys.every((key) => {
          const prevValue = prev[key];
          const nextValue = next[key];
          return (
            !!nextValue &&
            prevValue.visible === nextValue.visible &&
            prevValue.color.toLowerCase() === nextValue.color.toLowerCase()
          );
        });

      if (isSame) {
        return prev;
      }

      void persistFeatureStates(next, prev);
      return next;
    });
  }, [featureStateSaving, featureTypeStats, persistFeatureStates, selectedDatasetDetail]);

  const handleTogglePlotVisibility = useCallback(
    (trackId: string) => {
      if (!selectedDatasetDetail || plotStateSaving) {
        return;
      }

      setPlotTracks((prev) =>
        prev.map((track) =>
          track.id === trackId ? { ...track, visible: !track.visible } : track
        )
      );
      setDetailError(null);
    },
    [plotStateSaving, selectedDatasetDetail]
  );

  const handleResetPlotControls = useCallback(() => {
    if (!selectedDatasetDetail || plotStateSaving) {
      return;
    }
    const normalized = normalizePlotTracksForState(selectedDatasetDetail.plotTracks);
    setPlotTracks(normalized);
    setDetailError(null);
  }, [normalizePlotTracksForState, plotStateSaving, selectedDatasetDetail]);

  const handleSavePlotControls = useCallback(async () => {
    if (!selectedDatasetDetail || plotStateSaving || !plotControlsDirty) {
      return;
    }

    const sanitized = normalizePlotTracksForState(plotTracks);

    setPlotStateSaving(true);
    try {
      await ImportService.updatePlotTracks(selectedDatasetDetail.id, sanitized);
      setSelectedDatasetDetail((prev) =>
        prev && prev.id === selectedDatasetDetail.id
          ? { ...prev, plotTracks: sanitized }
          : prev
      );
      setDatasets((prev) =>
        prev.map((item) =>
          item.id === selectedDatasetDetail.id ? { ...item, plotTracks: sanitized } : item
        )
      );
      setPlotTracks(sanitized);
      setDetailError(null);
    } catch (error) {
      console.error(error);
      setDetailError(t("workspace:plotControls.saveFailed"));
      const fallback = normalizePlotTracksForState(selectedDatasetDetail.plotTracks);
      setPlotTracks(fallback);
    } finally {
    setPlotStateSaving(false);
  }
  }, [
    normalizePlotTracksForState,
    plotControlsDirty,
    plotStateSaving,
    plotTracks,
    selectedDatasetDetail,
    setDatasets,
    setSelectedDatasetDetail,
    t
  ]);

  const handleToggleLinkVisibility = useCallback(
    (trackId: string) => {
      if (!selectedDatasetDetail || linkStateSaving) {
        return;
      }

      setLinkTracks((prev) =>
        prev.map((track) =>
          track.id === trackId ? { ...track, visible: !track.visible } : track
        )
      );
      setDetailError(null);
    },
    [linkStateSaving, selectedDatasetDetail]
  );

  const handleUpdateLinkColor = useCallback(
    (trackId: string, nextColor: string) => {
      if (!selectedDatasetDetail || linkStateSaving) {
        return;
      }

      const value = typeof nextColor === "string" ? nextColor.trim() : "";
      if (!isValidHexColor(value)) {
        return;
      }

      setLinkTracks((prev) =>
        prev.map((track) => (track.id === trackId ? { ...track, color: value } : track))
      );
      setDetailError(null);
    },
    [linkStateSaving, selectedDatasetDetail]
  );

  const handleResetLinkControls = useCallback(() => {
    if (!selectedDatasetDetail || linkStateSaving) {
      return;
    }

    const normalized = normalizeLinkTracksForState(selectedDatasetDetail.linkTracks);
    setLinkTracks(normalized);
    setDetailError(null);
  }, [linkStateSaving, normalizeLinkTracksForState, selectedDatasetDetail]);

  const handleSaveLinkControls = useCallback(async () => {
    if (!selectedDatasetDetail || linkStateSaving || !linkControlsDirty) {
      return;
    }

    const sanitized = normalizeLinkTracksForState(linkTracks);

    setLinkStateSaving(true);
    try {
      await ImportService.updateLinkTracks(selectedDatasetDetail.id, sanitized);
      setSelectedDatasetDetail((prev) =>
        prev && prev.id === selectedDatasetDetail.id ? { ...prev, linkTracks: sanitized } : prev
      );
      setDatasets((prev) =>
        prev.map((item) =>
          item.id === selectedDatasetDetail.id ? { ...item, linkTracks: sanitized } : item
        )
      );
      setLinkTracks(sanitized);
      setDetailError(null);
    } catch (error) {
      console.error(error);
      setDetailError(t("workspace:linkControls.saveFailed"));
      const fallback = normalizeLinkTracksForState(selectedDatasetDetail.linkTracks);
      setLinkTracks(fallback);
    } finally {
      setLinkStateSaving(false);
    }
  }, [
    linkControlsDirty,
    linkStateSaving,
    linkTracks,
    normalizeLinkTracksForState,
    selectedDatasetDetail,
    setDatasets,
    setSelectedDatasetDetail,
    t
  ]);

  if (!project) {
    return (
      <div className="workspace">
        <div className="workspace__empty">
          <p>{t("workspace:empty")}</p>
          <button type="button" onClick={onExit}>
            {t("workspace:actions.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      <header className="workspace__header">
        <div>
          <h2>{project.name}</h2>
          <p className="workspace__subtext">
            {project.description ?? t("workspace:noDescription")}
          </p>
        </div>
        <div className="workspace__meta">
          <span>{t("workspace:meta.createdAt", { value: meta?.createdAt })}</span>
          <span>{t("workspace:meta.updatedAt", { value: meta?.updatedAt })}</span>
        </div>
        <button type="button" onClick={onExit}>
          {t("workspace:actions.back")}
        </button>
      </header>
      <section className="workspace__content">
        <article className="card workspace__datasets">
          <header className="workspace__datasets-header">
            <h3>{t("workspace:datasets.title")}</h3>
            <div className="workspace__datasets-actions">
              {datasetsLoading ? <span className="badge">{t("common:app.loading")}</span> : null}
              <button
                type="button"
                onClick={refreshDatasets}
                disabled={datasetsLoading || deletePending}
              >
                {t("workspace:datasets.refresh")}
              </button>
            </div>
          </header>
          {datasetsError ? (
            <div className="alert alert--error">{datasetsError}</div>
          ) : null}
          {datasets.length === 0 ? (
            <div className="workspace__datasets-empty">
              <p>{t("workspace:datasets.empty")}</p>
            </div>
          ) : (
            <ul className="workspace__datasets-list">
              {datasets.map((dataset) => (
                <li
                  key={dataset.id}
                  className={dataset.id === selectedDatasetId ? "is-active" : undefined}
                  onClick={() => setSelectedDatasetId(dataset.id)}
                >
                  <div className="workspace__datasets-primary">
                    <span className="workspace__datasets-name">{dataset.displayName}</span>
                    <span className="workspace__datasets-format">{dataset.format.toUpperCase()}</span>
                  </div>
                  <div className="workspace__datasets-source">{dataset.sourcePath}</div>
                  <div className="workspace__datasets-meta">
                    <span>
                      {t("workspace:datasets.recordCount", {
                        count: dataset.statistics?.totalFeatures ?? dataset.recordCount
                      })}
                    </span>
                    <span>
                      {t("workspace:datasets.importedAt", {
                        value: new Date(dataset.createdAt).toLocaleString()
                      })}
                    </span>
                    {dataset.organism ? <span>{dataset.organism}</span> : null}
                    {typeof dataset.totalLength === 'number' && dataset.totalLength > 0 ? (
                      <span>{t('workspace:datasets.sequenceLength', { length: dataset.totalLength })}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="workspace__datasets-detail">
            <h4>{t("workspace:datasets.detailTitle")}</h4>
            {detailLoading ? (
              <span className="badge">{t("workspace:datasets.detailLoading")}</span>
            ) : null}
            {detailError ? <div className="alert alert--error">{detailError}</div> : null}
            {!detailLoading && !detailError && selectedDatasetDetail ? (
              <div className="workspace__datasets-detail-body">
                <div className="workspace__datasets-detail-actions">
                  <button
                    type="button"
                    onClick={handleDeleteDataset}
                    disabled={deletePending}
                    className="workspace__datasets-delete"
                  >
                    {deletePending
                      ? t('workspace:datasets.deleting')
                      : t('workspace:datasets.delete')}
                  </button>
                </div>
                <form className="workspace__datasets-rename" onSubmit={handleRenameSubmit}>
                  <label>
                    <span>{t("workspace:datasets.displayNameLabel")}</span>
                    <div className="workspace__datasets-rename-controls">
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(event) => setDisplayNameInput(event.target.value)}
                        placeholder={t("workspace:datasets.displayNamePlaceholder")}
                        disabled={renamePending}
                      />
                      <button type="submit" disabled={renameDisabled}>
                        {renamePending
                          ? t("workspace:datasets.renaming")
                          : t("workspace:datasets.renameSave")}
                      </button>
                      <button
                        type="button"
                        onClick={handleRenameReset}
                        disabled={renamePending || !canResetDisplayName}
                      >
                        {t("workspace:datasets.renameReset")}
                      </button>
                    </div>
                  </label>
                </form>
                <div className="workspace__datasets-meta">
                  <span>
                    {t("workspace:datasets.recordCount", {
                      count:
                        selectedDatasetDetail.statistics?.totalFeatures ??
                        selectedDatasetDetail.recordCount
                    })}
                  </span>
                  <span>
                    {t("workspace:datasets.importedAt", {
                      value: new Date(selectedDatasetDetail.createdAt).toLocaleString()
                    })}
                  </span>
                  {selectedDatasetDetail.organism ? (
                    <span>{selectedDatasetDetail.organism}</span>
                  ) : null}
                  {typeof selectedDatasetDetail.totalLength === "number" &&
                  selectedDatasetDetail.totalLength > 0 ? (
                    <span>
                      {t("workspace:datasets.sequenceLength", {
                        length: selectedDatasetDetail.totalLength
                      })}
                    </span>
                  ) : null}
                  <span>
                    {t("workspace:datasets.featureTotal", { count: totalFeatureCount })}
                  </span>
                  {featureFilter.trim() ? (
                    <span>
                      {t("workspace:datasets.filterMatches", {
                        matched: filteredFeatures.length
                      })}
                    </span>
                  ) : null}
                </div>
                <div className="workspace__datasets-filter">
                  <input
                    type="search"
                    value={featureFilter}
                    placeholder={t("workspace:datasets.filterPlaceholder")}
                    onChange={(event) => setFeatureFilter(event.target.value)}
                  />
                {featureFilter ? (
                  <button type="button" onClick={() => setFeatureFilter("")}>
                    {t("workspace:datasets.clearFilter")}
                  </button>
                ) : null}
              </div>
              {featureControlList.length > 0 ? (
                <div className="workspace__feature-controls">
                  <div className="workspace__feature-controls-header">
                    <h4>{t("workspace:featureControls.title")}</h4>
                    <div className="workspace__feature-controls-meta">
                      {featureStateSaving ? (
                        <span className="workspace__feature-controls-saving">
                          {t("workspace:featureControls.saving")}
                        </span>
                      ) : null}
                      {hiddenFeatureCount > 0 ? (
                        <span className="workspace__feature-controls-hidden">
                          {t("workspace:featureControls.hiddenCount", { count: hiddenFeatureCount })}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="workspace__feature-controls-reset"
                        onClick={handleResetFeatureControls}
                        disabled={featureStateSaving}
                      >
                        {t("workspace:featureControls.reset")}
                      </button>
                    </div>
                  </div>
                  <ul className="workspace__feature-controls-list">
                    {featureControlList.map((item) => (
                      <li key={item.key} className={!item.visible ? "is-muted" : undefined}>
                        <label className="workspace__feature-controls-toggle">
                          <input
                            type="checkbox"
                            checked={item.visible}
                            disabled={featureStateSaving}
                            onChange={() => handleToggleFeatureVisibility(item.key)}
                          />
                          <span>{item.label}</span>
                        </label>
                        <span className="workspace__feature-controls-count">
                          {t("workspace:featureControls.count", { count: item.count })}
                        </span>
                        <input
                          type="color"
                          value={item.color}
                          disabled={featureStateSaving}
                          onChange={(event) =>
                            handleUpdateFeatureColor(item.key, event.target.value)
                          }
                          aria-label={t("workspace:featureControls.colorLabel", {
                            type: item.label
                          })}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="workspace__plot-controls">
                <div className="workspace__plot-controls-header">
                  <h4>{t("workspace:plotControls.title")}</h4>
                  <div className="workspace__plot-controls-meta">
                    {plotStateSaving ? (
                      <span className="workspace__plot-controls-saving">
                        {t("workspace:plotControls.saving")}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleResetPlotControls}
                      disabled={plotStateSaving || plotControlList.length === 0}
                    >
                      {t("workspace:plotControls.reset")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePlotControls}
                      disabled={plotStateSaving || !plotControlsDirty}
                    >
                      {t("workspace:plotControls.save")}
                    </button>
                  </div>
                </div>
                {plotControlList.length > 0 ? (
                  <ul className="workspace__plot-controls-list">
                    {plotControlList.map((track) => (
                      <li key={track.id} className={!track.visible ? "is-muted" : undefined}>
                        <label className="workspace__plot-controls-toggle">
                          <input
                            type="checkbox"
                            checked={track.visible}
                            disabled={plotStateSaving}
                            onChange={() => handleTogglePlotVisibility(track.id)}
                          />
                          <span>{track.name}</span>
                        </label>
                        <span className="workspace__plot-controls-kind">{track.kindLabel}</span>
                        <span
                          className="workspace__plot-controls-color"
                          style={{ backgroundColor: track.color }}
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="workspace__plot-controls-empty">
                    {t("workspace:plotControls.empty")}
                  </p>
                )}
              </div>
              <div className="workspace__link-controls">
                <div className="workspace__link-controls-header">
                  <h4>{t("workspace:linkControls.title")}</h4>
                  <div className="workspace__link-controls-meta">
                    {linkStateSaving ? (
                      <span className="workspace__link-controls-saving">
                        {t("workspace:linkControls.saving")}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleResetLinkControls}
                      disabled={linkStateSaving || linkControlList.length === 0}
                    >
                      {t("workspace:linkControls.reset")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLinkControls}
                      disabled={linkStateSaving || !linkControlsDirty}
                    >
                      {t("workspace:linkControls.save")}
                    </button>
                  </div>
                </div>
                {linkControlList.length > 0 ? (
                  <ul className="workspace__link-controls-list">
                    {linkControlList.map((track) => (
                      <li key={track.id} className={!track.visible ? "is-muted" : undefined}>
                        <label className="workspace__link-controls-toggle">
                          <input
                            type="checkbox"
                            checked={track.visible}
                            disabled={linkStateSaving}
                            onChange={() => handleToggleLinkVisibility(track.id)}
                          />
                          <span>{track.name}</span>
                        </label>
                        <span className="workspace__link-controls-kind">{track.kindLabel}</span>
                        <span className="workspace__link-controls-connection">
                          {t("workspace:linkControls.connectionCount", {
                            count: track.connectionCount
                          })}
                        </span>
                        <span
                          className="workspace__link-controls-color"
                          style={{ backgroundColor: track.color }}
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="workspace__link-controls-empty">
                    {t("workspace:linkControls.empty")}
                  </p>
                )}
              </div>
              {filteredFeatures.length > 0 ? (
                <>
                  <p className="workspace__datasets-preview-label">
                    {t("workspace:datasets.featurePreview", {
                      count: previewFeatures.length,
                        total: filteredFeatures.length
                      })}
                    </p>
                    <pre className="workspace__datasets-preview">
                      {JSON.stringify(previewFeatures, null, 2)}
                    </pre>
                  </>
                ) : (
                  <p className="workspace__datasets-empty">
                    {featureFilter.trim()
                      ? t("workspace:datasets.filterEmpty")
                      : t("workspace:datasets.detailEmpty")}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </article>
        <article className="card workspace__viewer">
          <div className="workspace__viewer-controls">
            <label>
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(event) => setShowLegend(event.target.checked)}
              />
              <span>{t('workspace:viewer.legendToggle')}</span>
            </label>
          </div>
          {viewerStats ? (
            <div className="workspace__viewer-stats">
              <div className="workspace__viewer-stat">
                <span className="workspace__viewer-stat-label">{t('workspace:viewer.stats.total')}</span>
                <span className="workspace__viewer-stat-value">
                  {numberFormatter.format(viewerStats.totalFeatures)}
                </span>
              </div>
              <div className="workspace__viewer-stat">
                <span className="workspace__viewer-stat-label">{t('workspace:viewer.stats.filtered')}</span>
                <span className="workspace__viewer-stat-value">
                  {numberFormatter.format(viewerStats.filteredCount)}
                </span>
              </div>
              <div className="workspace__viewer-stat">
                <span className="workspace__viewer-stat-label">{t('workspace:viewer.stats.length')}</span>
                <span className="workspace__viewer-stat-value">
                  {viewerStats.totalLength !== null
                    ? t('workspace:viewer.stats.lengthValue', {
                        value: numberFormatter.format(viewerStats.totalLength)
                      })
                    : t('workspace:viewer.unknown')}
                </span>
              </div>
              {viewerStats.truncatedCount > 0 ? (
                <div className="workspace__viewer-stat">
                  <span className="workspace__viewer-stat-label">{t('workspace:viewer.stats.truncated')}</span>
                  <span className="workspace__viewer-stat-value workspace__viewer-stat-value--warning">
                    {t('workspace:viewer.stats.truncatedValue', {
                      count: numberFormatter.format(viewerStats.truncatedCount)
                    })}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {viewerTruncated ? (
            <div className="workspace__viewer-warning">
              {t('workspace:viewer.truncated', { count: MAX_VIEWER_FEATURES })}
            </div>
          ) : null}
          <CgviewViewer dataset={viewerDataset} showLegend={showLegend} />
        </article>
        <article className="card workspace__import">
          <DataImportWizard projectId={project.id} onImported={handleImported} />
        </article>
      </section>
    </div>
  );
};
