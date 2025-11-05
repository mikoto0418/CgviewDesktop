/**
 * 图层配置存储工具
 * 提供图层配置的保存、加载、删除和管理功能
 */

export type LayerVisibility = {
  type: string;
  visible: boolean;
  color: string;
  labelVisible: boolean;
  labelField?: string;
  opacity: number;
};

export type LayerConfigTemplate = {
  id: string;
  name: string;
  description?: string;
  layers: LayerVisibility[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
};

const STORAGE_PREFIX = 'cgview.layer-config';
const MAX_CONFIGS = 20; // 最多保存20个配置模板

/**
 * 生成配置ID
 */
const generateId = (): string => {
  return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 获取存储键名
 */
const getStorageKey = (configId?: string): string => {
  return configId ? `${STORAGE_PREFIX}.${configId}` : `${STORAGE_PREFIX}.templates`;
};

/**
 * 获取所有配置模板列表
 */
export const getAllConfigs = (): LayerConfigTemplate[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const key = getStorageKey();
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return [];
    }

    const configs = JSON.parse(stored);
    return Array.isArray(configs) ? configs : [];
  } catch (error) {
    console.error('获取图层配置失败:', error);
    return [];
  }
};

/**
 * 保存配置模板
 */
export const saveConfig = (name: string, layers: LayerVisibility[], description?: string): LayerConfigTemplate => {
  if (typeof window === 'undefined') {
    throw new Error('只能在浏览器环境中保存配置');
  }

  if (!name.trim()) {
    throw new Error('配置名称不能为空');
  }

  const configs = getAllConfigs();

  // 检查配置名称是否已存在
  const existingConfig = configs.find((config) => config.name === name.trim());
  const now = Date.now();

  let config: LayerConfigTemplate;

  if (existingConfig) {
    // 更新现有配置
    config = {
      ...existingConfig,
      layers,
      description,
      updatedAt: now
    };
  } else {
    // 创建新配置
    config = {
      id: generateId(),
      name: name.trim(),
      description,
      layers,
      createdAt: now,
      updatedAt: now
    };
    configs.push(config);

    // 限制配置数量
    if (configs.length > MAX_CONFIGS) {
      configs.sort((a, b) => b.updatedAt - a.updatedAt);
      configs.splice(MAX_CONFIGS);
    }
  }

  try {
    window.localStorage.setItem(getStorageKey(), JSON.stringify(configs));
    return config;
  } catch (error) {
    console.error('保存图层配置失败:', error);
    throw new Error('保存配置失败，可能是存储空间不足');
  }
};

/**
 * 加载配置模板
 */
export const loadConfig = (configId: string): LayerConfigTemplate | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const configs = getAllConfigs();
    return configs.find((config) => config.id === configId) || null;
  } catch (error) {
    console.error('加载图层配置失败:', error);
    return null;
  }
};

/**
 * 删除配置模板
 */
export const deleteConfig = (configId: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const configs = getAllConfigs();
    const filteredConfigs = configs.filter((config) => config.id !== configId);

    if (filteredConfigs.length === configs.length) {
      return false; // 配置不存在
    }

    window.localStorage.setItem(getStorageKey(), JSON.stringify(filteredConfigs));
    return true;
  } catch (error) {
    console.error('删除图层配置失败:', error);
    return false;
  }
};

/**
 * 获取默认配置
 */
export const getDefaultConfig = (): LayerConfigTemplate | null => {
  const configs = getAllConfigs();
  return configs.find((config) => config.isDefault) || null;
};

/**
 * 设置默认配置
 */
export const setDefaultConfig = (configId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const configs = getAllConfigs();
    const updatedConfigs = configs.map((config) => ({
      ...config,
      isDefault: config.id === configId
    }));

    window.localStorage.setItem(getStorageKey(), JSON.stringify(updatedConfigs));
  } catch (error) {
    console.error('设置默认配置失败:', error);
  }
};

/**
 * 重置为默认配置（全部显示）
 */
export const resetToDefault = (layers: LayerVisibility[]): LayerVisibility[] => {
  return layers.map((layer) => ({
    ...layer,
    visible: true,
    opacity: 0.8
  }));
};

/**
 * 导出配置为JSON字符串
 */
export const exportConfig = (config: LayerConfigTemplate): string => {
  return JSON.stringify(config, null, 2);
};

/**
 * 从JSON字符串导入配置
 */
export const importConfig = (jsonString: string): LayerConfigTemplate => {
  try {
    const config = JSON.parse(jsonString);

    // 验证配置格式
    if (!config.name || !Array.isArray(config.layers)) {
      throw new Error('配置格式不正确');
    }

    // 验证图层数据
    config.layers.forEach((layer: LayerVisibility) => {
      if (!layer.type || typeof layer.visible !== 'boolean' || typeof layer.opacity !== 'number') {
        throw new Error(`图层 "${layer.type}" 的数据格式不正确`);
      }
    });

    // 生成新的ID，避免冲突
    return {
      ...config,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('JSON格式错误');
    }
    throw error;
  }
};
