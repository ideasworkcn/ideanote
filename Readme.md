


          
查看项目文件以了解目录结构和开发方式。
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/william/ideaswork/repo/ideanote/package.json
/Users/william/ideaswork/repo/ideanote/src/main.ts
/Users/william/ideaswork/repo/ideanote/src/renderer.ts
          
查看更多配置文件以完整了解项目结构。
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/william/ideaswork/repo/ideanote/forge.config.ts
/Users/william/ideaswork/repo/ideanote/index.html
/Users/william/ideaswork/repo/ideanote/src/preload.ts
          
# IdeaNote - AI驱动的创意写作工具

## 项目简介

IdeaNote 是一个基于 Electron Forge 和 Vite + TypeScript 的桌面应用项目，专为创意写作而设计的AI驱动工具。

**作者**: ideaswork  
**B站账号**: ideaswork

## 项目架构概览

这是一个基于 Electron Forge 和 Vite + TypeScript 的桌面应用项目，采用现代化的开发架构：

## 核心文件结构

### 配置文件
- **package.json** - 项目依赖和脚本配置
- **forge.config.ts** - Electron Forge 打包和构建配置
- **tsconfig.json** - TypeScript 配置

### Vite 配置文件
- **vite.main.config.ts** - 主进程构建配置
- **vite.renderer.config.ts** - 渲染进程构建配置  
- **vite.preload.config.ts** - 预加载脚本构建配置

### 源代码目录 (src/)
- **main.ts** - Electron 主进程代码
  - 创建和管理应用窗口
  - 处理应用生命周期事件
  - 窗口尺寸和配置设置
- **renderer.ts** - 渲染进程入口
  - 前端 React 应用的启动点
  - IdeaNote 创意写作工具界面
- **preload.ts** - 预加载脚本（用于安全的主进程与渲染进程通信）
- **index.css** - 样式文件

### 前端文件
- **index.html** - HTML 模板文件

## 开发流程说明

### 1. 启动开发服务器
```bash
pnpm start
```
这会启动 Electron 应用并打开开发工具。

### 2. 开发前端界面
- 在 `src/renderer.ts` 中开发 React 组件
- 使用 `index.html` 作为 HTML 模板
- 通过 `index.css` 添加样式

### 3. 主进程开发
- 在 `src/main.ts` 中添加原生功能
- 通过预加载脚本安全地暴露 API

### 4. 构建和打包
```bash
pnpm package  # 打包应用
pnpm make     # 制作安装包
```

## 笔记本应用开发建议

1. **数据存储**：添加数据库或文件系统操作
2. **UI 组件**：在 renderer 中开发笔记编辑界面
3. **窗口管理**：在 main.ts 中配置多窗口或浮动窗口
4. **快捷键**：通过主进程注册全局快捷键

项目已经配置完成，可以立即开始开发你的笔记本应用！
        