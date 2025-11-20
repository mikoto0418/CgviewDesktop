import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectSummary } from '@shared/domain/project';
import { EnhancedWorkspaceView } from './EnhancedWorkspaceView';
import { ImportService } from '../../services/import-service';
import type { DatasetSummary } from '@shared/parser/types';
import { DataImportWizard } from '../import/DataImportWizard';

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
      <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '20px' }}>
        <p style={{ fontSize: '18px', color: 'var(--system-text-secondary)' }}>{t('workspace:empty')}</p>
        <button type="button" onClick={onExit} className="btn-apple-secondary">
          {t('workspace:actions.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ height: '100vh', width: '100%', background: 'var(--system-background)' }}>
      {/* 顶部工具栏 */}
      <header style={{ 
        height: '60px',
        padding: '0 24px', 
        borderBottom: '1px solid var(--system-divider)',
        background: 'var(--glass-background)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            type="button" 
            onClick={onExit} 
            className="btn-apple-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>←</span> {t('workspace:actions.back')}
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--system-divider)' }} />

          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{project.name}</h1>
          </div>

          {/* 数据集选择器 - 集成在顶部栏 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--system-text-secondary)' }}>{t('workspace:datasets.title')}:</span>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              disabled={datasetsLoading || datasets.length === 0}
              style={{ 
                width: '240px', 
                padding: '4px 8px', 
                fontSize: '13px',
                background: 'var(--system-background-tertiary)',
                border: 'none'
              }}
            >
              <option value="">{t('workspace:datasets.empty')}</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.displayName || dataset.sourcePath} ({dataset.format.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--system-text-secondary)' }}>
          {datasets.length > 0 && (
            <span style={{ background: 'var(--system-background-secondary)', padding: '4px 8px', borderRadius: '6px' }}>
              {datasets.length} {t('workspace:datasets.recordCount', { count: '' })}
            </span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
             <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* 主体内容区域 - 左右分栏布局 */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {datasetDetail ? (
          <EnhancedWorkspaceView dataset={datasetDetail} />
        ) : (
          <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '100%', maxWidth: '600px', padding: '20px' }}>
              <div className="card glass-panel">
                <DataImportWizard 
                  projectId={project.id} 
                  onImported={(response: any) => {
                    refreshDatasets();
                    setSelectedDatasetId(response.dataset.id);
                  }} 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
