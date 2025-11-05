# CGView 可视化桌面应用开发文档

## 1. 项目概览
- **背景**：CGView 及 cgview.js 能够生成高质量环状基因组图，但缺乏集成的现代 GUI、数据管理与国际化支持。
- **目标**：构建跨平台桌面应用（Windows/macOS/Linux），覆盖 CGView 全部绘图能力，提供数据筛选、模板管理、批处理、导入导出等功能，并内置中英双语界面（默认中文）。
- **用户群体**：基因组可视化分析人员、生物信息工程师、科研人员。
- **关键设计原则**：坚持 KISS 简单化架构、YAGNI 控制范围只覆盖已知需求、DRY 消除重复逻辑、SOLID 确保模块解耦可扩展。

## 2. 功能范围与对照矩阵
| 功能模块 | CGView 原功能 | 目标应用实现 | 说明 |
| --- | --- | --- | --- |
| 数据导入 | GenBank/GFF 输入、命令行参数 | 支持 GenBank、GFF3、JSON、CSV 批量导入；可拖拽 | 统一解析接口，检验并提示错误 |
| 图层配置 | 圈层、标签、颜色、渐变、图例 | GUI 可视化配置与实时预览 | 支持模板保存与回滚 |
| 数据筛选 | CLI 参数控制 | GUI 条件筛选、关键词过滤、范围筛选 | 可保存过滤器组合 |
| 渲染 | 高分辨率 SVG/PNG | 使用 cgview.js 实时渲染，支持交互缩放 | 提供画布快照与参数查看 |
| 导出 | SVG、PNG、PDF、JPG、批量脚本 | 一键导出 SVG/PNG/PDF、批处理队列 | 批量结果带元数据 |
| 模板/项目 | 无 | 项目管理、配置模板、最近打开 | SQLite 存储项目与模板 |
| 批处理 | 命令行脚本 | UI 批处理队列、进度监控、日志 | 支持任务重试 |
| 国际化 | 无 | 中文/英文语言包，运行时切换 | 文案统一从 i18n key 读取 |

### 2.1 对标 CGView Server（Proksee）升级能力的最终目标
- **交互式圈图编辑器**：提供所见即所得的图层开关、拖拽排序、透明度与标签样式调整，前端保持 SRP 不引入多余状态（KISS），并通过统一 `LayerVisibilityManager` 避免重复逻辑（DRY）。
- **Feature 管理工作台**：支持按类型/关键字批量选中、设色、重命名，使用分层命令服务与解析结果解耦（SOLID-D），确保仅在用户触发时加载扩展属性（YAGNI）。
- **统计 Plot 轨道**：内置 GC 含量/GC 偏斜/自定义 coverage 曲线，曲线绘制通过可插拔 `PlotProvider` 扩展以符合 OCP；数据缓存复用 `Dataset` 派生结果，避免重复计算（DRY）。
- **Links 同源连线视图**：导入 BLAST/比对结果生成跨环连线，链接渲染复用统一 `IRenderer` 接口保证 LSP；对大规模连线自动分桶和抽样提示，保持界面响应（KISS）。
- **模板与项目复用**：支持将当前图层/配色/Plot 组合保存为模板，一键应用到批量项目；模板持久化沿用 `PersistenceAdapter`，不额外复制配置片段（DRY）。
- **高分辨率导出与日志追踪**：导出 PNG/SVG/PDF 时可选择 DPI、背景色并记录来源数据哈希，导出流水统一写入 `ExportService`，批处理复用同一队列（SOLID-S/I）。
- **图层状态持久化**：数据集的图层可见性与颜色偏好写入持久化层，工作区加载时自动恢复，避免重复配置（DRY），并为空间轨道/连线扩展保留统一接口（OCP）。
- **引导与文档联动**：在关键面板内嵌渐进式指引与示例圈图，全部文案由 i18n 资源驱动，避免硬编码（DRY），并保证新手能复现 Proksee 操作体验。

## 3. 系统架构
- **整体形态**：Electron 桌面应用（主进程 + 渲染进程），内嵌 Node.js 服务层，前端采用 React + TypeScript。
- **主要组成**：
  1. **Electron 主进程**：应用生命周期、原生菜单、系统对话框、文件访问、安全沙箱。
  2. **渲染进程（前端）**：React SPA，负责 UI、状态管理（Redux Toolkit 或 Zustand）、国际化呈现。
  3. **渲染适配层 (`CgviewAdapter`)**：封装 cgview.js，接收领域模型并渲染到 SVG 画布。
  4. **业务服务层**：运行在 Electron 主进程或独立 Node 线程，包含解析器、过滤器、导出与批处理逻辑。
  5. **数据持久层 (`PersistenceAdapter`)**：基于 SQLite + Prisma/Knex 迁移，记录项目、模板、任务队列、用户首选项。
- **模块间关系**：前端通过 IPC/RPC 接口调用服务层；服务层调用解析器和渲染器；持久化层提供统一仓储接口；国际化资源由前端加载。

## 4. 模块设计
### 4.1 Domain 模型
- `GenomeProject`: 项目信息、元数据、配置模板引用。
- `Dataset`: 文件信息、解析状态、原始记录、校验报告。
- `FeatureLayer`: 图层定义（类型、颜色、标签策略、刻度设定）。
- `RenderConfig`: 画布尺寸、缩放级别、特性可见性、图例配置。
- `FilterDefinition`: 条件组合（类型、范围、属性）。
- `ExportJob`: 导出任务状态、目标格式、输出路径。
- VisualizationLayoutState: Plot/Links 轨道配置，用于跨模块共享绘图布局。

### 4.2 解析器子系统 (SRP, OCP)
- 定义接口 `IAnnotationParser`（方法：`detect(file)`, `parse(stream)`, `toDomain()`）。
- 实现：`GenBankAnnotationParser`（解析 LOCUS/FEATURES 并归一化坐标）、`Gff3AnnotationParser`（基于 @gmod/gff 解析属性）、`JsonAnnotationParser`（读取结构化 JSON）、`CsvAnnotationParser`（读取 start/stop 等列的轨迹 CSV）。
- 公共逻辑：通过 `normalizeResult` 统一截断超量特征、补全序列长度、输出双语警告，避免重复。
- 扩展：新增格式通过实现接口并注册即可，符合开放封闭原则。

### 4.3 渲染适配层 (DIP)
- `CgviewAdapter` / `CgviewViewer` 负责：
  - 将 Domain 模型映射为 cgview.js 配置，并在 React 组件中管理 `cgview.js` Viewer 生命周期。
  - 管理画布重建、缩放、导出按钮等交互，保持 KISS（无多余状态）与 SRP。
  - 针对超大特征列表自动截断并展示提示，确保渲染流畅与用户知情。
- 抽象接口 `IRenderer`，未来可替换其他引擎保持里氏替换。

### 4.4 过滤与视图控制
- `FilterEngine`：运行过滤规则，支持组合逻辑与预览。
- `LayerVisibilityManager`：控制图层启用/禁用、排序、透明度。
- `SelectionService`: 用户在图上选择后高亮并回写筛选条件。

### 4.5 导出与批处理
- `ExportService`: 单个导出 (SVG/PNG/PDF)、图像后处理、批量任务的快照记录。
- `BatchProcessor`: 基于 Worker Threads/Node 子进程执行，维护任务队列、进度、取消与重试；任务持久化到 SQLite。
- 日志模块：结构化日志（winston/pino），前端显示任务日志。

### 4.6 持久化与迁移 (SRP, DIP)
- 数据库：SQLite，文件放置在用户数据目录。
- 使用 Prisma/Knex 生成迁移文件与 schema 版本管理。
- 仓储接口：
  - `ProjectRepository`
  - `DatasetRepository`
  - `TemplateRepository`
  - `JobRepository`
  - `PreferenceRepository`
- 提供 `PersistenceAdapter` 抽象层，未来迁移到 MySQL/PostgreSQL 时实现新适配器即可。

### 4.7 国际化
- 使用 i18next：
  - 默认语言 `zh-CN`，备选 `en-US`。
  - 资源文件 `locales/zh-CN.json`, `locales/en-US.json`。
  - 关键文案使用命名空间（例如 `menus`, `dialogs`, `forms`）。
- UI 设置中提供语言切换，下次启动读取 `PreferenceRepository` 存储的语言设置。
- 文档、帮助中心提供双语内容。

### 4.8 UI 组件结构 (KISS)
- `AppShell`: 布局、导航、语言切换。
- `ProjectDashboard`: 项目管理、最近打开。
- `DataUploadPanel`: 文件拖拽、校验报告。
- `FilterPanel`: 条件构建器、保存/复用过滤器。
- `LayerConfigurator`: 图层列表、样式编辑、顺序调整。
- `VisualizationCanvas`: 渲染区域，内嵌 cgview.js。
- `ExportDialog`: 导出选项、格式、分辨率。
- `BatchQueueView`: 任务列表、状态、日志。
- `PreferencesDialog`: 全局设置（语言、默认路径等）。
- 每个组件保持单一责任，复用通用表单/按钮组件减少重复。

## 5. 数据流与交互流程
1. 用户在 `ProjectDashboard` 创建/打开项目 → `ProjectService` 从数据库载入配置。
2. `DataUploadPanel` 导入文件 → `ParserService` 检测格式并解析 → 更新 `DatasetRepository`。
3. 解析结果转为 `FeatureLayer`、`RenderConfig` → 通过 `RendererService` 渲染预览。
4. 用户调整筛选/图层 → `FilterEngine` 应用规则 → 渲染层触发重绘。
5. 导出任务提交 → `ExportService` 入队 → `BatchProcessor` 异步执行 → 结果写入数据库并通知 UI。
6. 用户切换语言 → `i18next` 更换资源包 → UI 即时更新，并将选择写入首选项。

## 6. 数据库设计 (初稿)
- `projects`：`id`, `name`, `description`, `created_at`, `updated_at`, `default_render_config_id`.
- `datasets`：`id`, `project_id`, `file_name`, `file_type`, `status`, `metadata_json`, `imported_at`.
- `dataset_features`：`id`, `dataset_id`, `feature_index`, `payload_json` —— 存储解析后的原始特征 JSON，按顺序索引，支持后续渲染与增量更新。
- `feature_layers`：`id`, `project_id`, `name`, `config_json`, `order`.
- `render_configs`：`id`, `project_id`, `payload_json`, `is_template`.
- `filters`：`id`, `project_id`, `name`, `definition_json`, `is_shared`.
- `jobs`：`id`, `type`, `project_id`, `payload_json`, `status`, `progress`, `started_at`, `finished_at`, `log_path`.
- `preferences`：`key`, `value`, `scope`（`user`/`project`）。
- 所有 JSON 字段存储结构化配置，使用校验层保障有效性。

## 7. 国际化细节
- 文案命名约定：`<模块>.<元素>`（如 `filter.addCondition`）。
- 要求：新增 UI 元素必须同时补充中英文资源；CI 校验缺失 key。
- 时间/数字格式：使用 `Intl` API 根据语言自动格式化；日期默认 ISO。
- 帮助文档与工具提示：`docs/` 目录维护双语 Markdown，应用内渲染。

## 8. 性能与可扩展性
- 渲染优化：针对大规模特性（>50k features）支持渐进式渲染、虚拟滚动；必要时引入 Web Worker 做预处理。
- 批处理：限制并行任务数，避免阻塞 UI；任务运行于后台线程。
- 日志与监控：提供可选调试面板显示渲染耗时、内存使用。
- 扩展能力：通过插件接口允许新增图层类型或导出格式，插件需实现约定的 TypeScript 接口。

## 9. 测试策略
- **单元测试**：解析器、过滤器、服务层使用 Jest 覆盖边界情况。
- **集成测试**：渲染适配器使用快照比对；导出功能生成样例文件并校验结构。
- **端到端测试**：Playwright 自动化模拟导入→配置→导出的流程；覆盖语言切换。
- **国际化测试**：脚本检查两个语言包 key 是否对齐，防止遗漏。
- **性能基准**：基于典型基因组数据集建立性能基线，CI 中定期运行。

## 10. 开发流程与规范
- 分支策略：Git `main` + 功能分支；功能完成经代码审查后合并。
- 代码规范：TypeScript ESLint + Prettier；提交前运行 `lint`、`test`。
- 提交信息：遵循 Conventional Commits。
- 文档更新：新增/修改功能时同步更新 `docs/` 与语言包。
- 安全：解析器在隔离线程运行，验证输入避免任意代码执行。

## 11. 构建与发布
- 构建脚本：使用 `electron-builder` 生成 Windows (.exe)、macOS (.dmg/.pkg)、Linux (.AppImage/.deb)。
- CI/CD：GitHub Actions / GitLab CI。
  - 阶段：`install` → `lint/test` → `build` → `package`。
  - 打包时嵌入数据库迁移脚本与默认模板。
- 发布渠道：官网/私有分发；提供离线安装包及校验和。
- 配置：应用首次启动自动执行数据库迁移，创建默认模板与示例项目。

## 12. 路线图
1. **迭代 0**：脚手架搭建、国际化基础、渲染 demo（验证 cgview.js 集成）、SQLite 初始化。
2. **迭代 1**：完成数据导入、解析器、项目存储、基础渲染、语言切换。
3. **迭代 2**：实现图层配置、筛选、导出、模板管理。
4. **迭代 3**：批处理队列、任务监控、日志、性能优化。
5. **迭代 4**：插件接口、扩展格式、CI 自动化发布。
6. **持续**：收集用户反馈，基于 KISS/YAGNI 评估新增需求，保持文档与测试同步。

## 13. 风险与缓解
- **大规模数据性能瓶颈**：提前建立基准与缓存策略，必要时引入 Web Worker。
- **国际化遗漏**：CI 校验缺失 key，代码审查重点关注。
- **跨平台差异**：持续在三大平台验证文件系统/字体/打包问题。
- **未来数据库迁移**：保持 `PersistenceAdapter` 抽象，迁移脚本独立管理。

---

本文档作为团队协作与后续迭代的基准，所有新增需求需评估对 KISS/YAGNI/DRY/SOLID 原则的影响，并在更新时同步维护。
