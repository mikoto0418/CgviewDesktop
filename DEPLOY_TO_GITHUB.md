# GitHub 部署指南

本指南将帮助您将CGView桌面版项目推送到GitHub仓库。

## 📋 前提条件

在开始之前，请确保：

- ✅ 已安装Git（[下载Git](https://git-scm.com/downloads)）
- ✅ 拥有GitHub账号（[注册GitHub](https://github.com/signup)）
- ✅ 已完成项目的本地开发和测试
- ✅ 项目中的敏感信息（如API密钥）已移除或添加到`.gitignore`

## 🚀 部署步骤

### 1. 初始化Git仓库（如果还未初始化）

```bash
cd f:\2025实验室\cgviewtest
git init
```

如果项目已经有`.git`目录，可以跳过此步骤。

### 2. 配置Git用户信息（首次使用Git）

```bash
# 配置用户名
git config --global user.name "你的名字"

# 配置邮箱
git config --global user.email "your.email@example.com"
```

### 3. 检查当前状态

```bash
# 查看当前文件状态
git status

# 查看将被忽略的文件
git status --ignored
```

确认`.gitignore`正常工作，开发文档和数据库文件不在跟踪列表中。

### 4. 暂存所有更改

```bash
# 添加所有文件到暂存区
git add .

# 查看暂存的文件
git status
```

**重要提示**：确保以下文件/目录**不在**暂存列表中：
- ❌ `node_modules/`
- ❌ `dist/`
- ❌ `data/`（包含数据库文件）
- ❌ `.env`
- ❌ 开发文档（*.md除了README.md和LICENSE）

### 5. 创建初始提交

```bash
git commit -m "Initial commit: CGView Desktop Application"
```

或者更详细的提交信息：

```bash
git commit -m "feat: Initial release of CGView Desktop Application

- Electron + React 18 based genome visualization tool
- Support for GenBank, GFF3, JSON, CSV formats
- Project management with SQLite persistence
- Bilingual interface (Chinese/English)
- Customizable layer configurations
- Plot tracks for GC content and GC skew"
```

### 6. 在GitHub创建新仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 `+` → `New repository`
3. 填写仓库信息：
   - **Repository name**: `cgview-desktop` 或您喜欢的名称
   - **Description**: `Modern genome visualization and annotation tool`
   - **Public/Private**: 根据需求选择
   - ⚠️ **不要**勾选 "Initialize this repository with a README"
4. 点击 `Create repository`

### 7. 关联远程仓库

复制GitHub给出的仓库URL，然后执行：

```bash
# HTTPS 方式（推荐新手）
git remote add origin https://github.com/yourusername/cgview-desktop.git

# 或使用 SSH 方式（需要配置SSH密钥）
git remote add origin git@github.com:yourusername/cgview-desktop.git

# 验证远程仓库
git remote -v
```

### 8. 推送到GitHub

```bash
# 首次推送，设置上游分支
git push -u origin main

# 如果您的默认分支是master
git push -u origin master
```

如果遇到分支名称问题：

```bash
# 将当前分支重命名为main
git branch -M main

# 然后推送
git push -u origin main
```

### 9. 验证部署

访问您的GitHub仓库页面，确认：
- ✅ 所有源代码文件已上传
- ✅ README.md正确显示
- ✅ `.gitignore`文件存在
- ✅ 不包含`node_modules`、`dist`、`data`等目录
- ✅ 项目结构清晰完整

## 🔄 后续更新

### 日常提交流程

```bash
# 1. 查看修改
git status

# 2. 添加修改的文件
git add <file1> <file2>
# 或添加所有修改
git add .

# 3. 提交更改
git commit -m "描述本次更改"

# 4. 推送到GitHub
git push
```

### 标准提交信息格式

遵循约定式提交（Conventional Commits）：

```bash
# 新功能
git commit -m "feat: 添加GC偏斜图表功能"

# 修复bug
git commit -m "fix: 修复项目删除时的数据清理问题"

# 文档更新
git commit -m "docs: 更新README使用说明"

# 代码重构
git commit -m "refactor: 优化数据导入性能"

# 样式修改
git commit -m "style: 调整仪表盘布局"

# 测试
git commit -m "test: 添加项目管理单元测试"
```

### 版本标签

创建版本发布：

```bash
# 创建标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 推送标签到GitHub
git push origin v1.0.0

# 推送所有标签
git push --tags
```

## ⚠️ 重要注意事项

### 必须忽略的文件

确保`.gitignore`包含以下内容：

```gitignore
# 依赖
node_modules/

# 构建产物
dist/
build/
out/
release/

# 数据库和数据
data/
*.db
*.sqlite
*.sqlite3

# 环境变量
.env
.env.local

# 日志
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*

# 操作系统
.DS_Store
Thumbs.db
desktop.ini

# 开发文档（保留在本地）
开发*.md
文档*.md
*_v*.md
```

### 安全检查清单

在推送前，确认：

- [ ] 所有API密钥和敏感信息已移除
- [ ] `.env`文件已在`.gitignore`中
- [ ] 数据库文件不在仓库中
- [ ] 没有个人信息或测试数据
- [ ] 第三方库通过package.json管理，不直接提交

### 常见问题

**Q: 推送时显示权限错误？**

A: 使用HTTPS方式需要GitHub个人访问令牌（Personal Access Token）：
1. GitHub → Settings → Developer settings → Personal access tokens
2. 生成新令牌，勾选`repo`权限
3. 使用令牌代替密码

**Q: 如何撤销已提交但未推送的commit？**

```bash
# 撤销最后一次commit，保留更改
git reset --soft HEAD~1

# 撤销最后一次commit，丢弃更改
git reset --hard HEAD~1
```

**Q: 不小心提交了敏感文件怎么办？**

```bash
# 从Git历史中完全移除文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/sensitive/file" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送
git push origin --force --all
```

**Q: 如何同步GitHub上的更改到本地？**

```bash
# 拉取最新更改
git pull origin main
```

## 🎯 推荐的工作流程

### 功能开发分支

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发和提交
git add .
git commit -m "feat: 实现新功能"

# 3. 推送分支
git push origin feature/new-feature

# 4. 在GitHub创建Pull Request

# 5. 合并后，切换回主分支
git checkout main
git pull origin main

# 6. 删除本地分支
git branch -d feature/new-feature
```

### 发布流程

```bash
# 1. 更新版本号（package.json）
# 2. 更新CHANGELOG（如果有）
# 3. 提交版本更改
git add package.json
git commit -m "chore: bump version to 1.0.0"

# 4. 创建标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 5. 推送
git push origin main
git push origin v1.0.0

# 6. 在GitHub创建Release
```

## 📚 相关资源

- [Git官方文档](https://git-scm.com/doc)
- [GitHub使用指南](https://docs.github.com/cn)
- [约定式提交规范](https://www.conventionalcommits.org/zh-hans/)
- [语义化版本](https://semver.org/lang/zh-CN/)

## 🆘 获取帮助

如果遇到问题：
1. 查看[GitHub Issues](https://github.com/yourusername/cgview-desktop/issues)
2. 阅读[Git故障排除](https://git-scm.com/docs/git-help)
3. 访问[Stack Overflow](https://stackoverflow.com/questions/tagged/git)

---

**完成部署后，记得在README.md中更新仓库链接！**
