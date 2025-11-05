import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectSummary } from '@shared/domain/project';
import { EnhancedWorkspaceView } from './EnhancedWorkspaceView';
import { ImportService } from '../../services/import-service';
import type { DatasetSummary } from '@shared/parser/types';

interface WorkspaceIntegrationViewProps {
  project: ProjectSummary | null;
  onExit: () => void;
}

/**
 * 工作区视图 - 标准左右分栏布局
 * 左侧：可视化展示区域（固定不滚动）
 * 右侧：控制面板（可独立滚动）
 */
export const WorkspaceIntegrationView = ({
  project,
  onExit
}: WorkspaceIntegrationViewProps) => {
  const { t } = useTranslation(['workspace', 'common']);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [datasetDetail, setDatasetDetail] = useState<any>(null);
  const [datasetsLoading, setDatasetsLoading] = useState(false);

  // 加载数据集列表
  const refreshDatasets = async () => {
    if (!project) {
      setDatasets([]);
      setSelectedDatasetId(null);
      setDatasetDetail(null);
      return;
    }

    setDatasetsLoading(true);
    try {
      const list = await ImportService.listDatasets(project.id);
      setDatasets(list);
      if (list.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(list[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDatasetsLoading(false);
    }
  };

  useEffect(() => {
    refreshDatasets();
  }, [project]);

  // 加载选中的数据集详情
  useEffect(() => {
    const loadDetail = async () => {
      if (!selectedDatasetId) {
        setDatasetDetail(null);
        return;
      }

      try {
        const detail = await ImportService.getDataset(selectedDatasetId);
        setDatasetDetail(detail);
      } catch (error) {
        console.error(error);
        setDatasetDetail(null);
      }
    };

    loadDetail();
  }, [selectedDatasetId]);

  // 当项目为空时，显示空状态
  if (!project) {
    return (
      <div className="workspace">
        <div className="workspace__empty">
          <p>{t('workspace:empty')}</p>
          <button type="button" onClick={onExit}>
            {t('workspace:actions.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-main-container">
      {/* 顶部导航栏 */}
      <header className="workspace-main-header">
        <div className="workspace-main-header-content">
          <div className="workspace-main-title">
            <h1>{project.name}</h1>
            <p className="workspace-main-subtitle">
              {project.description ?? t('workspace:noDescription')}
            </p>
          </div>
          <div className="workspace-main-meta">
            <div className="meta-item">
              <span className="meta-label">{t('workspace:meta.createdAt')}</span>
              <span className="meta-value">
                {new Date(project.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">{t('workspace:meta.updatedAt')}</span>
              <span className="meta-value">
                {new Date(project.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
          <button type="button" onClick={onExit} className="btn-exit">
            {t('workspace:actions.back')}
          </button>
        </div>
      </header>

      {/* 数据集选择器 */}
      <div className="workspace-dataset-bar">
        <div className="workspace-dataset-selector">
          <label>
            <span>{t('workspace:datasets.title')}</span>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              disabled={datasetsLoading || datasets.length === 0}
              className="dataset-select"
            >
              <option value="">{t('workspace:datasets.empty')}</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.displayName || dataset.sourcePath} ({dataset.format.toUpperCase()})
                </option>
              ))}
            </select>
          </label>
          {datasets.length > 0 && (
            <span className="dataset-count">
              {datasets.length} {t('workspace:datasets.recordCount', { count: '' })}
            </span>
          )}
        </div>
      </div>

      {/* 主体内容区域 - 左右分栏布局 */}
      <div className="workspace-main-content">
        {datasetDetail ? (
          <EnhancedWorkspaceView dataset={datasetDetail} />
        ) : (
          <div className="workspace-main-empty">
            <p>{t('workspace:datasets.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
