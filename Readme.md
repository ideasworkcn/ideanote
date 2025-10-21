# IdeaNote - AI驱动的创意写作工具

<div align="center">
  <img src="./ideanote.png" alt="IdeaNote Screenshot" width="600" height="400">
  
  **专为创意写作而设计的智能桌面应用**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Electron](https://img.shields.io/badge/Electron-38.3.0-blue.svg)](https://electronjs.org/)
  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-4.5.4-blue.svg)](https://www.typescriptlang.org/)
</div>

## 📋 目录

- [✨ 项目简介](#-项目简介)
- [🚀 核心功能](#-核心功能)
-[🛠️ 技术架构](#️-技术架构)
- [📦 快速开始](#-快速开始)
- [🔧 开发指南](#-开发指南)
- [📁 项目结构](#-项目结构)
- [⚙️ 配置说明](#️-配置说明)
- [🎯 使用教程](#-使用教程)
- [📤 发布到GitHub](#-发布到github)
- [🤝 贡献指南](#-贡献指南)
- [📄 许可证](#-许可证)
- [🙏 致谢](#-致谢)
- [📞 联系我们](#-联系我们)

## ✨ 项目简介

IdeaNote 是一款基于 Electron 的跨平台桌面应用，专为创意写作者打造。它集成了先进的 AI 技术，提供智能写作辅助、富文本编辑、文档管理等功能，让创意写作变得更加高效和有趣。

**作者**: ideaswork  
**联系方式**: ideaswork@qq.com  
**B站账号**: [@ideaswork](https://space.bilibili.com/28249524)

## 🚀 核心功能

### 📝 智能编辑器
- **Novel 编辑器**: 基于 Tiptap 的 Notion 风格 WYSIWYG 编辑器
- **AI 智能辅助**: 集成 DeepSeek AI，提供文稿润色、语法检查、内容扩写等功能
- **丰富的内容类型**: 支持文本、标题、列表、表格、代码块、数学公式等
- **实时预览**: 支持 Markdown 渲染和数学公式显示
- **快捷命令**: 通过 `/` 命令快速插入各种内容块

### 🤖 AI 写作助手
- **文稿润色**: 智能优化文本表达和语言风格
- **语法检查**: 自动检测并修正语法错误
- **内容扩写**: 根据上下文智能扩展内容
- **内容缩写**: 提炼文本精华，保持核心信息
- **创意生成**: 多种文案生成模板（营销文案、教程文案、课程文案等）

### 📁 文档管理
- **工作区管理**: 灵活的工作区选择和切换
- **文件系统**: 基于 JSON 的文档存储，支持创建、重命名、删除
- **搜索功能**: 快速搜索和定位文档内容
- **自动保存**: 实时保存编辑内容，防止数据丢失

### 🎨 界面与体验
- **现代化 UI**: 基于 Tailwind CSS 的精美界面设计
- **暗色主题**: 支持明暗主题切换（开发中）
- **响应式布局**: 适配不同屏幕尺寸
- **快捷键支持**: 丰富的键盘快捷键操作

## 🛠️ 技术架构

### 前端技术栈
- **Electron**: 跨平台桌面应用框架
- **React 18**: 现代化前端框架
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 快速的构建工具
- **Tailwind CSS**: 实用优先的 CSS 框架

### 编辑器技术
- **Novel**: Notion 风格的富文本编辑器
- **Tiptap**: 可扩展的富文本编辑器框架
- **ProseMirror**: 强大的编辑器内核

### UI 组件库
- **Radix UI**: 无样式的可访问组件库
- **Lucide React**: 精美的图标库
- **Sonner**: 优雅的通知组件

### AI 集成
- **DeepSeek API**: 智能文本生成和处理
- **流式响应**: 实时 AI 内容生成体验

## 📦 快速开始

### 环境要求
- **Node.js**: 16.0 或更高版本（推荐 18.0+）
- **npm**: 7.0 或更高版本
- **Git**: 用于代码管理

### 一键安装
```bash
# 克隆项目
git clone https://github.com/ideaswork/ideanote.git

# 进入项目目录
cd ideanote

# 安装依赖
npm install

# 启动应用
npm start
```

### 验证安装
启动后应该能看到应用界面，首次使用会提示选择工作区目录。

## 🔧 开发指南

### 开发环境搭建

#### 1. 克隆和安装
```bash
git clone https://github.com/ideaswork/ideanote.git
cd ideanote
npm install
```

#### 2. 开发模式运行
```bash
# 启动开发服务器
npm start
```

#### 3. 构建项目
```bash
# 构建所有模块（渲染进程 + 主进程 + 预加载脚本）
npm run build

# 单独构建模块
npm run build:renderer    # 仅构建渲染进程
npm run build:main       # 仅构建主进程
npm run build:preload    # 仅构建预加载脚本
```

#### 4. 打包应用
```bash
# 打包应用（生成安装包）
npm run package

# 制作安装包
npm run make

# 发布应用
npm run publish
```

### 开发注意事项
- 使用 TypeScript 进行开发，确保类型安全
- 遵循现有的代码风格和组件结构
- 在提交前运行代码检查：`npm run lint`

## 📁 项目结构

```
ideanote/
├── src/                      # 源代码目录
│   ├── main.ts              # Electron 主进程入口
│   ├── preload.ts           # 预加载脚本
│   ├── renderer.ts          # 渲染进程入口
│   ├── app.tsx              # React 应用主组件
│   ├── components/          # React 组件
│   │   ├── ui/              # 基础 UI 组件
│   │   ├── notion/          # 侧边栏组件
│   │   ├── settings/        # 设置组件
│   │   ├── AboutDialog.tsx  # 关于对话框
│   │   ├── Footer.tsx       # 底部组件
│   │   ├── Header.tsx       # 头部组件
│   │   └── WelcomePage.tsx  # 欢迎页面
│   ├── lib/                 # 工具库
│   │   ├── api-key-storage.ts   # API 密钥存储
│   │   ├── content.ts       # 内容处理
│   │   ├── copyContent.ts   # 文案管理
│   │   └── utils.ts         # 通用工具
│   ├── hooks/               # React Hooks
│   │   ├── use-toast.ts     # 通知提示
│   │   └── useCompletion.ts # AI 自动完成
│   ├── types/               # TypeScript 类型定义
│   │   └── Model.ts         # 数据模型
│   ├── index.css            # 全局样式
│   └── prosemirror.css      # 编辑器样式
├── assets/                  # 静态资源
│   ├── icon.svg            # 应用图标（SVG格式）
│   └── icon.png            # 应用图标（PNG格式）
├── dist/                    # 构建输出目录
├── out/                     # 打包输出目录
├── electron-builder.yml     # 打包配置
├── vite.main.config.ts      # 主进程构建配置
├── vite.preload.config.ts   # 预加载脚本配置
├── vite.renderer.config.ts  # 渲染进程配置
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.js       # Tailwind CSS 配置
└── README.md               # 项目说明
```

## ⚙️ 配置说明

### 应用信息配置
在 `package.json` 中可以修改应用信息：
```json
{
  "name": "ideanote",           // 应用包名
  "productName": "IdeaNote",    // 显示名称
  "version": "1.0.0",           // 版本号
  "description": "AI驱动的创意写作工具",  // 描述
  "author": {
    "name": "ideaswork",        // 作者名
    "email": "ideaswork@qq.com" // 作者邮箱
  }
}
```

### 图标配置
在 `electron-builder.yml` 中配置应用图标：
```yaml
appId: com.ideaswork.ideanote
productName: IdeaNote
icon: assets/icon.png  # 图标文件路径
```

### AI 配置
在应用中点击设置按钮，配置 DeepSeek API Key 以启用 AI 功能。

### 工作区配置
首次启动时会提示选择工作区文件夹，所有文档将保存在该目录下。

## 🎯 使用教程

### 基本操作流程

#### 1. 首次启动
- 启动应用后会显示欢迎页面
- 点击"选择工作区"按钮选择文档保存目录
- 设置完成后进入主界面

#### 2. 创建和编辑文档
- **创建文档**: 点击侧边栏的 "+" 按钮或使用快捷键 `Ctrl/Cmd + N`
- **编辑文档**: 在编辑器中直接输入内容，支持 Markdown 语法
- **保存文档**: 使用 `Ctrl/Cmd + S` 快捷键或自动保存
- **删除文档**: 在侧边栏右键点击文档名称选择删除

#### 3. 使用 AI 功能
- **选中文本**: 在编辑器中选择需要处理的文本
- **打开 AI 面板**: 点击工具栏的 "Ask AI" 按钮
- **选择功能**: 选择需要的 AI 功能（润色、扩写、缩写等）
- **查看结果**: AI 处理完成后会显示结果，可选择应用或复制

#### 4. 使用快捷命令
- **命令面板**: 输入 `/` 打开命令面板
- **插入标题**: 输入 `/heading` 或 `/h1`、`/h2` 等
- **插入列表**: 输入 `/list` 或 `/bullet`
- **插入代码块**: 输入 `/code`
- **插入表格**: 输入 `/table`

### 快捷键大全
- `Ctrl/Cmd + S` - 保存文档
- `Ctrl/Cmd + N` - 创建新文档
- `Ctrl/Cmd + Z` - 撤销
- `Ctrl/Cmd + Y` - 重做
- `Ctrl/Cmd + A` - 全选
- `Ctrl/Cmd + C` - 复制
- `Ctrl/Cmd + V` - 粘贴
- `/` - 打开命令面板

## 📤 发布到GitHub

### 准备工作
1. **确保代码已提交**
```bash
git add .
git commit -m "发布版本 v1.0.0"
```

2. **创建版本标签**
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 发布步骤

#### 方法1：使用GitHub网页界面
1. 访问 GitHub 仓库页面
2. 点击 "Releases" → "Create a new release"
3. 选择刚刚推送的标签 `v1.0.0`
4. 填写发布标题和描述
5. 上传打包好的安装包文件（`.dmg`、`.exe`、`.AppImage`等）
6. 点击 "Publish release"

#### 方法2：使用GitHub CLI
```bash
# 安装 GitHub CLI（如果未安装）
brew install gh

# 登录 GitHub
gh auth login

# 创建发布
gh release create v1.0.0 \
  --title "IdeaNote v1.0.0" \
  --notes "AI驱动的创意写作工具首次发布" \
  ./out/electron-builder/*.dmg \
  ./out/electron-builder/*.exe \
  ./out/electron-builder/*.AppImage
```

### 发布内容建议
在发布描述中包含以下内容：
- **新功能**: 列出主要功能特性
- **系统要求**: 支持的操作系统版本
- **安装说明**: 如何安装和使用
- **已知问题**: 如果有的话
- **联系方式**: 如何反馈问题和建议

### 自动发布（可选）
可以配置 GitHub Actions 实现自动发布：
1. 在 `.github/workflows/` 目录创建发布工作流
2. 配置在创建标签时自动构建和发布
3. 设置自动上传构建产物到 Release

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 贡献流程
1. **Fork 本项目** 到您的 GitHub 账户
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **开启 Pull Request** 到主仓库

### 开发规范
- 使用 TypeScript 进行开发
- 遵循现有的代码风格和组件结构
- 添加必要的注释和文档
- 在提交前运行代码检查：`npm run lint`
- 测试功能确保稳定性

### 报告问题
发现问题时，请通过以下方式报告：
- **Issue 标题**: 简明扼要描述问题
- **问题描述**: 详细说明问题现象
- **复现步骤**: 如何重现该问题
- **环境信息**: 操作系统、Node.js版本等
- **截图或日志**: 如果有的话

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Novel](https://github.com/steven-tey/novel) - 优秀的编辑器框架
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [Radix UI](https://www.radix-ui.com/) - 优秀的组件库
- [DeepSeek](https://www.deepseek.com/) - 强大的 AI 能力支持
- [Vite](https://vitejs.dev/) - 快速的构建工具
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

## 📞 联系我们

- **作者**: ideaswork
- **邮箱**: ideaswork@qq.com
- **B站**: [@ideaswork](https://space.bilibili.com/28249524)
- **GitHub**: [ideaswork](https://github.com/ideaswork)

---

<div align="center">
  <p>⭐ 如果这个项目对你有帮助，请给它一个 Star！</p>
  <p>❤️ Made with love by ideaswork</p>
  <p>🚀 持续更新中，欢迎关注项目进展</p>
</div>
        