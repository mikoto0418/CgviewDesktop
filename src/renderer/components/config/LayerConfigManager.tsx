import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayerVisibility, LayerConfigTemplate } from '../../utils/layer-config-storage';

type LayerConfigManagerProps = {
  currentLayers: LayerVisibility[];
  onApplyConfig: (layers: LayerVisibility[]) => void;
};

export const LayerConfigManager = ({
  currentLayers,
  onApplyConfig
}: LayerConfigManagerProps) => {
  const { t } = useTranslation(['workspace', 'common']);
  const [configs, setConfigs] = useState<LayerConfigTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      // 动态导入避免SSR问题
      const storage = await import('../../utils/layer-config-storage');
      const allConfigs = storage.getAllConfigs();
      setConfigs(allConfigs.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      console.error('加载配置列表失败:', error);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // 保存配置
  const handleSave = async () => {
    try {
      setError(null);
      const storage = await import('../../utils/layer-config-storage');
      storage.saveConfig(saveName, currentLayers, saveDescription);
      setShowSaveDialog(false);
      setSaveName('');
      setSaveDescription('');
      loadConfigs();
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败');
    }
  };

  // 加载配置
  const handleLoad = async (config: LayerConfigTemplate) => {
    try {
      onApplyConfig(config.layers);
      setShowLoadDialog(false);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 删除配置
  const handleDelete = async (configId: string) => {
    if (!confirm(t('configManager.confirmDelete'))) {
      return;
    }

    try {
      const storage = await import('../../utils/layer-config-storage');
      storage.deleteConfig(configId);
      loadConfigs();
    } catch (error) {
      console.error('删除配置失败:', error);
    }
  };

  // 设置默认配置
  const handleSetDefault = async (configId: string) => {
    try {
      const storage = await import('../../utils/layer-config-storage');
      storage.setDefaultConfig(configId);
      loadConfigs();
    } catch (error) {
      console.error('设置默认配置失败:', error);
    }
  };

  // 重置为默认配置
  const handleReset = async () => {
    try {
      const storage = await import('../../utils/layer-config-storage');
      const defaultLayers = storage.resetToDefault(currentLayers);
      onApplyConfig(defaultLayers);
    } catch (error) {
      console.error('重置配置失败:', error);
    }
  };

  // 导出配置
  const handleExport = async (config: LayerConfigTemplate) => {
    try {
      const storage = await import('../../utils/layer-config-storage');
      const jsonString = storage.exportConfig(config);

      // 创建下载
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出配置失败:', error);
    }
  };

  // 导入配置
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const storage = await import('../../utils/layer-config-storage');
      const config = storage.importConfig(text);

      // 添加到本地存储
      const configs = storage.getAllConfigs();
      configs.push(config);
      storage.saveConfig(config.name, config.layers, config.description);

      loadConfigs();
      alert(t('configManager.importSuccess'));
    } catch (error) {
      alert(error instanceof Error ? error.message : '导入失败');
    }

    // 清空输入
    event.target.value = '';
  };

  // 保存对话框
  const SaveDialog = () => {
    if (!showSaveDialog) return null;

    return (
      <div className="config-dialog-overlay" onClick={() => setShowSaveDialog(false)}>
        <div className="config-dialog" onClick={(e) => e.stopPropagation()}>
          <h3>{t('configManager.saveDialog.title')}</h3>
          <div className="config-dialog-content">
            <div className="form-group">
              <label>{t('configManager.saveDialog.name')}</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t('configManager.saveDialog.namePlaceholder')}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>{t('configManager.saveDialog.description')}</label>
              <textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder={t('configManager.saveDialog.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
          <div className="config-dialog-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowSaveDialog(false);
                setError(null);
              }}
            >
              {t('common:common.cancel')}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!saveName.trim()}
            >
              {t('common:common.save')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 加载对话框
  const LoadDialog = () => {
    if (!showLoadDialog) return null;

    return (
      <div className="config-dialog-overlay" onClick={() => setShowLoadDialog(false)}>
        <div className="config-dialog" onClick={(e) => e.stopPropagation()}>
          <h3>{t('configManager.loadDialog.title')}</h3>
          <div className="config-dialog-content">
            {configs.length === 0 ? (
              <p className="empty-message">{t('configManager.noConfigs')}</p>
            ) : (
              <ul className="config-list">
                {configs.map((config) => (
                  <li key={config.id} className="config-item">
                    <div className="config-info">
                      <div className="config-name">
                        {config.name}
                        {config.isDefault && (
                          <span className="default-badge">{t('configManager.default')}</span>
                        )}
                      </div>
                      {config.description && (
                        <div className="config-description">{config.description}</div>
                      )}
                      <div className="config-meta">
                        {t('configManager.updated')}: {new Date(config.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="config-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleLoad(config)}
                      >
                        {t('configManager.apply')}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleExport(config)}
                        title={t('configManager.export')}
                      >
                        ⬇
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleSetDefault(config.id)}
                        title={t('configManager.setDefault')}
                      >
                        ⭐
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(config.id)}
                        title={t('common:common.delete')}
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="import-section">
              <label className="btn btn-secondary">
                {t('configManager.import')}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
          <div className="config-dialog-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowLoadDialog(false)}
            >
              {t('common:common.close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="layer-config-manager">
        <div className="config-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowSaveDialog(true)}
            title={t('configManager.saveTooltip')}
          >
            💾 {t('configManager.save')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowLoadDialog(true)}
            title={t('configManager.loadTooltip')}
          >
            📂 {t('configManager.load')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            title={t('configManager.resetTooltip')}
          >
            🔄 {t('configManager.reset')}
          </button>
        </div>
      </div>

      <SaveDialog />
      <LoadDialog />
    </>
  );
};
