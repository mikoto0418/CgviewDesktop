# 贡献指南

感谢您对 CGView 桌面版项目的兴趣！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- ✨ 提议新功能
- 📚 改进文档
- 💻 提交代码修复
- 🎨 优化界面设计
- 🧪 完善测试用例

## 目录

1. [行为准则](#行为准则)
2. [开发环境设置](#开发环境设置)
3. [开发流程](#开发流程)
4. [代码规范](#代码规范)
5. [提交规范](#提交规范)
6. [Pull Request 流程](#pull-request-流程)
7. [测试指南](#测试指南)
8. [文档贡献](#文档贡献)

---

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们作为贡献者和维护者承诺，无论年龄、体型、残疾、族裔、性别认同、经验水平、教育程度、社会经济地位、国籍、个人外表、种族、宗教或性认同和性取向，都让每个人在我们的项目和社区中参与无骚扰的体验。

### 我们的标准

有助于创造积极环境的行为包括：

- ✅ 使用友好和包容的语言
- ✅ 尊重不同的观点和经历
- ✅ 优雅地接受建设性批评
- ✅ 关注对社区最有利的事情
- ✅ 对其他社区成员表现出同理心

不可接受的行为包括：

- ❌ 使用色情语言或图像，以及任何形式的性关注或骚扰
- ❌ 恶意评论、人身攻击或政治攻击
- ❌ 公开或私下的骚扰
- ❌ 未经明确许可发布他人的私人信息
- ❌ 在专业环境中可能被合理认为不当的其他行为

## 开发环境设置

### 前置要求

- **Node.js**: >= 16.0.0 (推荐使用最新 LTS 版本)
- **npm**: >= 8.0.0
- **Git**: 最新版本
- **编辑器**: VS Code (推荐)

### 克隆仓库

```bash
# Fork 项目后，克隆你的 fork
git clone https://github.com/YOUR_USERNAME/cgview-desktop.git
cd cgview-desktop

# 添加上游仓库
git remote add upstream https://github.com/ORIGINAL_OWNER/cgview-desktop.git
```

### 安装依赖

```bash
# 安装项目依赖
npm install

# 安装 Husky (Git hooks)
npm run prepare
```

### 启动开发服务器

```bash
# 启动开发服务器
npm run dev

# 启动开发服务器并打开浏览器
npm run dev:open
```

### 环境变量

创建 `.env.local` 文件（可选）：

```env
# 开发模式
VITE_DEV_SERVER_URL=http://localhost:5173

# 日志级别
VITE_LOG_LEVEL=debug

# 数据库路径（开发环境）
VITE_DB_PATH=./dev.db
```

## 开发流程

### 创建分支

```bash
# 更新主分支
git checkout main
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name

# 或创建修复分支
git checkout -b fix/bug-description
```

### 分支命名规范

- `feature/*` - 新功能开发
- `fix/*` - Bug 修复
- `docs/*` - 文档更新
- `refactor/*` - 代码重构
- `test/*` - 测试相关
- `chore/*` - 构建流程或辅助工具的变动

### 开发建议

1. **保持小步提交** - 每次提交只包含一个逻辑变更
2. **定期同步** - 定期从主分支拉取更新
3. **编写测试** - 新功能应包含测试用例
4. **更新文档** - 如果功能有变更，同步更新文档

### 提交代码

```bash
# 查看变更
git status
git diff

# 添加文件
git add .

# 提交（遵循提交规范）
git commit -m "feat: add new feature"
```

## 代码规范

### TypeScript 规范

- **严格模式** - 使用严格类型检查
- **禁止 `any`** - 使用具体的类型定义
- **接口优先** - 优先使用接口定义数据结构
- **泛型使用** - 合理使用泛型提高类型安全

```typescript
// ✅ 好的例子
interface Feature {
  id: string;
  type: string;
  name: string;
  start: number;
  end: number;
}

function processFeatures(features: Feature[]): Feature[] {
  return features.filter(f => f.start < f.end);
}

// ❌ 避免使用 any
function processFeatures(features: any[]): any[] {
  return features;
}
```

### React 规范

- **函数组件** - 使用函数组件而非类组件
- **Hooks** - 使用 React Hooks 进行状态管理
- **命名规范** - 组件名使用 PascalCase
- **文件组织** - 相关逻辑和样式放在同一目录

```tsx
// ✅ 好的例子
interface LayerConfigProps {
  visible: boolean;
  onToggle: (visible: boolean) => void;
}

export const LayerConfig: React.FC<LayerConfigProps> = ({
  visible,
  onToggle
}) => {
  return (
    <button onClick={() => onToggle(!visible)}>
      {visible ? 'Hide' : 'Show'}
    </button>
  );
};
```

### 样式规范

- **CSS Modules** - 使用 CSS Modules 避免样式冲突
- **BEM 命名** - 使用 BEM 方法论命名类
- **变量使用** - 使用 CSS 自定义属性（变量）

```css
/* ✅ 好的例子 */
.workspace {
  display: flex;
  height: 100vh;
}

.workspace__header {
  padding: 1rem;
  background: var(--color-primary);
}

.workspace__header-title {
  font-size: 1.25rem;
  font-weight: bold;
}
```

### 文件组织

```
src/
├── components/          # 可复用组件
│   ├── common/         # 通用组件
│   └── specific/       # 特定功能组件
├── modules/            # 业务模块
│   ├── dashboard/      # 仪表盘模块
│   └── workspace/      # 工作区模块
├── utils/              # 工具函数
├── styles/             # 样式文件
├── types/              # TypeScript 类型定义
└── hooks/              # 自定义 Hooks
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 类型 (type)

- **feat** - 新功能
- **fix** - Bug 修复
- **docs** - 文档更新
- **style** - 代码格式化（不影响功能）
- **refactor** - 代码重构
- **test** - 测试相关
- **chore** - 构建流程或辅助工具
- **perf** - 性能优化
- **ci** - CI/CD 相关

### 示例

```bash
# 新功能
git commit -m "feat(workspace): add layer configuration panel"

# Bug 修复
git commit -m "fix(filter): resolve type selection not working"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(parser): simplify GenBank parser logic"

# 性能优化
git commit -m "perf(viewer): optimize rendering for large datasets"

# 破坏性变更
git commit -m "feat!: drop support for Node 14"
```

## Pull Request 流程

### 提交 PR 前检查

- [ ] 代码已遵循项目规范
- [ ] 已添加必要的测试用例
- [ ] 所有测试通过
- [ ] 文档已更新（如需要）
- [ ] 提交信息遵循规范

### 创建 PR

1. **Fork 仓库** 并创建功能分支
2. **开发功能** 并编写测试
3. **推送分支** 到你的 Fork
4. **创建 Pull Request**

PR 模板会自动填充，请填写：

```markdown
## 变更说明
简要描述此 PR 的变更内容

## 解决的问题
- 解决 #issue_number
- 或描述解决的问题

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试通过

## 截图（如适用）
如果涉及 UI 变更，请添加截图

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 自测通过
- [ ] 文档已更新
```

### PR 审查流程

1. **自动化检查** - CI 流水线会自动运行测试和检查
2. **代码审查** - 维护者会审查代码质量和规范
3. **修改** - 根据反馈进行必要的修改
4. **合并** - 审查通过后合并到主分支

### 合并策略

我们使用 **Squash and Merge** 策略：
- 保持提交历史整洁
- 每次 PR 生成一个清晰的提交记录
- 在 PR 标题中包含所有相关信息

## 测试指南

### 运行测试

```bash
# 运行所有测试
npm test

# 监视模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- feature-filter.test.ts
```

### 测试规范

- **单元测试** - 测试独立函数和组件
- **集成测试** - 测试模块间交互
- **模拟外部依赖** - 使用 Vitest 的 mock 功能

### 示例测试

```typescript
// feature-filter.test.ts
import { describe, it, expect } from 'vitest';
import { filterFeatures } from '../utils/feature-filter';

describe('filterFeatures', () => {
  it('should filter by feature type', () => {
    const features = [
      { id: '1', type: 'gene' },
      { id: '2', type: 'CDS' }
    ];

    const result = filterFeatures(features, { type: 'gene' });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('gene');
  });

  it('should handle empty filters', () => {
    const features = [
      { id: '1', type: 'gene' }
    ];

    const result = filterFeatures(features, {});

    expect(result).toEqual(features);
  });
});
```

### 测试覆盖要求

- **新功能** - 需要 80%+ 的测试覆盖率
- **Bug 修复** - 至少添加回归测试
- **重构** - 确保现有测试全部通过

## 文档贡献

### 文档类型

- **README** - 项目概述和快速开始
- **API 文档** - 接口和类型定义
- **用户手册** - 详细功能说明
- **开发者指南** - 开发环境和技术细节

### 文档规范

- **清晰简洁** - 使用简明的语言
- **示例代码** - 提供可运行的示例
- **截图说明** - 复杂操作添加截图
- **国际化** - 支持中英文

### 文档更新

```bash
# 编辑文档后，可以本地预览
npm run docs:serve

# 或使用静态网站生成器
npm run docs:build
```

## 常见问题

### Q: 如何获取帮助？

A: 可以通过以下方式：
- 创建 GitHub Issue
- 参与讨论区讨论
- 查看现有 Issue 和 Discussion

### Q: PR 多久会被审查？

A: 一般在 3-5 个工作日内得到反馈，复杂变更可能需要更长时间。

### Q: 如何成为维护者？

A: 持续贡献高质量代码，积极参与社区讨论，有一定贡献后可以申请成为维护者。

### Q: 可以添加新依赖吗？

A: 需要经过讨论，特别是：
- 新增主要依赖
- 增加 bundle 大小
- 引入新的技术栈

请先创建 Issue 讨论必要性。

## 致谢

感谢所有为 CGView 桌面版项目做出贡献的开发者和用户！你们的参与让这个项目变得更好。

特别感谢：
- 提交 Bug 报告的用户
- 完善测试用例的贡献者
- 改进文档的作者
- 提出宝贵建议的社区成员

---

**贡献愉快！** 🎉

如果有任何问题，请随时创建 Issue 或参与讨论。我们期待您的贡献！
