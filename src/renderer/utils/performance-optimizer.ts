/**
 * 性能优化工具
 * 提供大数据集渲染和计算的优化功能
 */

/**
 * 防抖函数 - 延迟执行回调
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数 - 限制函数执行频率
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 数据分块器 - 将大数据集分割成小块处理
 */
export class DataChunker<T> {
  private chunkSize: number;

  constructor(chunkSize: number = 1000) {
    this.chunkSize = chunkSize;
  }

  /**
   * 将数据分割成块
   */
  chunk(data: T[]): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += this.chunkSize) {
      chunks.push(data.slice(i, i + this.chunkSize));
    }
    return chunks;
  }

  /**
   * 异步处理所有块
   */
  async processChunks<TProcessed>(
    data: T[],
    processor: (chunk: T[], index: number) => Promise<TProcessed[]> | TProcessed[]
  ): Promise<TProcessed[]> {
    const chunks = this.chunk(data);
    const results: TProcessed[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const result = await processor(chunks[i], i);
      if (Array.isArray(result)) {
        results.push(...result);
      }
    }

    return results;
  }
}

/**
 * 缓存管理器 - 缓存计算结果避免重复计算
 */
export class CacheManager<TKey, TValue> {
  private cache = new Map<TKey, TValue>();
  private maxSize: number;
  private accessOrder: TKey[] = [];

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   */
  get(key: TKey): TValue | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 更新访问顺序
      this.updateAccessOrder(key);
    }
    return value;
  }

  /**
   * 设置缓存值
   */
  set(key: TKey, value: TValue): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // 删除最久未访问的项
      const lruKey = this.accessOrder.shift();
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 更新访问顺序
   */
  private updateAccessOrder(key: TKey): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}

/**
 * 大数据集特征过滤器 - 优化大数据集的特征渲染
 */
export class LargeDatasetOptimizer {
  private cacheManager: CacheManager<string, any>;
  private chunker: DataChunker<any>;

  constructor() {
    this.cacheManager = new CacheManager(50);
    this.chunker = new DataChunker(500);
  }

  /**
   * 智能过滤特征 - 基于位置和重要性
   */
  filterFeaturesForRendering<T extends { start: number; stop: number; importance?: number }>(
    features: T[],
    totalLength: number,
    options: {
      maxFeatures?: number;
      sampleRate?: number;
      importanceThreshold?: number;
    } = {}
  ): T[] {
    const { maxFeatures = 1500, sampleRate = 1.0, importanceThreshold = 0 } = options;

    if (features.length <= maxFeatures) {
      return features;
    }

    const cacheKey = `filter-${features.length}-${maxFeatures}-${sampleRate}-${importanceThreshold}`;
    const cached = this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 按位置分组
    const positionGroups = this.groupByPosition(features, totalLength);

    // 计算每个组的采样数量
    const totalGroups = Object.keys(positionGroups).length;
    const samplesPerGroup = Math.ceil(maxFeatures / totalGroups);

    const sampled: T[] = [];
    for (const group of Object.values(positionGroups)) {
      // 按重要性排序
      const sorted = group.sort((a, b) => (b.importance || 0) - (a.importance || 0));
      const takeCount = Math.min(samplesPerGroup, Math.ceil(sorted.length * sampleRate));
      sampled.push(...sorted.slice(0, takeCount));
    }

    // 限制总数
    const result = sampled.slice(0, maxFeatures);
    this.cacheManager.set(cacheKey, result);

    return result;
  }

  /**
   * 按位置分组特征
   */
  private groupByPosition<T extends { start: number; stop: number }>(
    features: T[],
    totalLength: number
  ): Record<string, T[]> {
    const groupCount = Math.ceil(features.length / 500); // 动态分组数
    const groupSize = Math.ceil(totalLength / groupCount);
    const groups: Record<string, T[]> = {};

    features.forEach((feature) => {
      const position = (feature.start + feature.stop) / 2;
      const groupIndex = Math.floor(position / groupSize);
      const groupKey = `group-${groupIndex}`;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(feature);
    });

    return groups;
  }

  /**
   * 计算特征密度（优化版）
   */
  calculateFeatureDensity<T extends { start: number; stop: number }>(
    features: T[],
    totalLength: number,
    windowSize: number = 1000
  ): Array<{ position: number; density: number }> {
    const cacheKey = `density-${features.length}-${totalLength}-${windowSize}`;
    const cached = this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const windows = Math.ceil(totalLength / windowSize);
    const density: Array<{ position: number; density: number }> = [];

    for (let i = 0; i < windows; i++) {
      const start = i * windowSize;
      const end = Math.min(start + windowSize, totalLength);

      let count = 0;
      features.forEach((feature) => {
        const overlap = Math.min(end, feature.stop) - Math.max(start, feature.start);
        if (overlap > 0) {
          count++;
        }
      });

      density.push({
        position: start + windowSize / 2,
        density: count / windowSize
      });
    }

    this.cacheManager.set(cacheKey, density);
    return density;
  }

  /**
   * 分层采样 - 保留数据分布的同时减少数据量
   */
  stratifiedSampling<T>(
    data: T[],
    targetSize: number,
    stratifier: (item: T) => string
  ): T[] {
    if (data.length <= targetSize) {
      return data;
    }

    // 按层分组
    const strata = new Map<string, T[]>();
    data.forEach((item) => {
      const key = stratifier(item);
      if (!strata.has(key)) {
        strata.set(key, []);
      }
      strata.get(key)!.push(item);
    });

    // 计算每层采样数量
    const total = data.length;
    const samples: T[] = [];
    strata.forEach((items, key) => {
      const proportion = items.length / total;
      const sampleCount = Math.max(1, Math.floor(proportion * targetSize));
      const sampled = this.takeRandom(items, sampleCount);
      samples.push(...sampled);
    });

    // 如果样本数超出目标，从总样本中随机选择
    if (samples.length > targetSize) {
      return this.takeRandom(samples, targetSize);
    }

    return samples;
  }

  /**
   * 随机取样
   */
  private takeRandom<T>(array: T[], count: number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cacheManager.size(),
      maxSize: 50
    };
  }
}

/**
 * 渲染队列管理器 - 管理大量DOM更新
 */
export class RenderQueue {
  private queue: Array<() => void> = [];
  private isProcessing = false;
  private batchSize: number;

  constructor(batchSize: number = 100) {
    this.batchSize = batchSize;
  }

  /**
   * 添加渲染任务
   */
  add(task: () => void): void {
    this.queue.push(task);
    this.process();
  }

  /**
   * 批量处理队列
   */
  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      batch.forEach((task) => task());

      // 让浏览器有机会渲染
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    this.isProcessing = false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * 获取队列长度
   */
  size(): number {
    return this.queue.length;
  }
}

/**
 * 内存监控器 - 监控内存使用情况
 */
export class MemoryMonitor {
  private observers: Array<(usage: number) => void> = [];

  /**
   * 添加内存使用监听器
   */
  addObserver(callback: (usage: number) => void): void {
    this.observers.push(callback);
  }

  /**
   * 移除监听器
   */
  removeObserver(callback: (usage: number) => void): void {
    this.observers = this.observers.filter((obs) => obs !== callback);
  }

  /**
   * 获取当前内存使用情况（MB）
   */
  getMemoryUsage(): number {
    if (typeof window === 'undefined' || !(window as any).performance?.memory) {
      return 0;
    }

    const memory = (window as any).performance.memory;
    return Math.round(memory.usedJSHeapSize / 1024 / 1024);
  }

  /**
   * 检查内存使用是否过高
   */
  isMemoryUsageHigh(thresholdMB: number = 100): boolean {
    return this.getMemoryUsage() > thresholdMB;
  }

  /**
   * 通知所有观察者
   */
  private notify(): void {
    const usage = this.getMemoryUsage();
    this.observers.forEach((obs) => obs(usage));
  }
}
