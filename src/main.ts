import { app, BrowserWindow, ipcMain, Menu, dialog, safeStorage } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
import { novelcopy } from './lib/copyContent';
import { buildKBDoc, KBDoc } from './lib/kb/text';

let kbDir: string;
let kbIndexData: { version: number; docs: KBDoc[] } = { version: 1, docs: [] };
let kbVectorData: { version: number; items: Array<{ id: string; chunkIndex: number; content: string; vector: number[] }> } = { version: 1, items: [] };

if (started) {
  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  app.quit();
}

let workspaceRoot: string;
let mainWindow: BrowserWindow | null = null;

function broadcast(channel: string, payload: any) {
  try {
    const wins = BrowserWindow.getAllWindows();
    for (const w of wins) {
      try { w.webContents.send(channel, payload); } catch {}
    }
  } catch {}
}

const readJsonSafe = (filePath: string): any | null => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('readJsonSafe failed:', filePath, e);
    return null;
  }
};

const writeJsonSafe = (filePath: string, data: any) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('writeJsonSafe failed:', filePath, e);
  }
};

// 统一文件名生成与重命名的清洗规则（顶层函数）
const sanitizeFileBase = (s: string): string => {
  try {
    let v = String(s || '').normalize('NFC').trim();
    // 替换不安全字符与空白为连字符
    v = v.replace(/[\/:*?"<>|]+/g, '-')
         .replace(/[\r\n]+/g, ' ')
         .replace(/\s+/g, '-')
         .replace(/-+/g, '-')
         .replace(/^-|-$/g, '');
    return v || '新文案';
  } catch {
    return '新文案';
  }
};



function ensureWorkspace() {
  if (!workspaceRoot) {
    // 优先使用已保存的路径，否则回退到默认路径
    const saved = (() => {
      try {
        const cfgPath = path.join(app.getPath('userData'), 'workspace-config.json');
        if (fs.existsSync(cfgPath)) {
          const raw = fs.readFileSync(cfgPath, 'utf8');
          const obj = JSON.parse(raw || '{}');
          const p = obj?.path;
          if (typeof p === 'string' && p.trim()) {
            return p.trim();
          }
        }
      } catch {}
      return null;
    })();
    workspaceRoot = saved || path.join(app.getPath('userData'), 'workspace');
  }
  fs.mkdirSync(workspaceRoot, { recursive: true });
  // 知识库目录
  kbDir = path.join(workspaceRoot, '.kb');
  fs.mkdirSync(kbDir, { recursive: true });
}

// 选择或初始化工作区路径，并持久化保存
async function initializeWorkspaceWithPrompt() {
  try {
    const cfgPath = path.join(app.getPath('userData'), 'workspace-config.json');
    let selected: string | null = null;
    // 尝试读取已保存的工作区路径
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf8');
        const obj = JSON.parse(raw || '{}');
        const p = obj?.path;
        if (typeof p === 'string' && fs.existsSync(p)) {
          selected = p;
        }
      }
    } catch {}

    // 总是弹出对话框供用户选择；若取消则回退到已保存或默认路径
    {
      const result = await dialog.showOpenDialog({
        title: '选择工作区文件夹',
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: selected || path.join(app.getPath('userData'), 'workspace'),
      });
      if (!result.canceled && result.filePaths && result.filePaths[0]) {
        selected = result.filePaths[0];
      } else {
        selected = selected || path.join(app.getPath('userData'), 'workspace');
      }
    }

    workspaceRoot = selected;
    fs.mkdirSync(workspaceRoot, { recursive: true });

    // 持久化保存选择的工作区路径
    try {
      fs.writeFileSync(cfgPath, JSON.stringify({ path: workspaceRoot }, null, 2));
    } catch (e) {
      console.error('保存工作区路径失败:', e);
    }
  } catch (e) {
    console.error('初始化工作区失败:', e);
    workspaceRoot = path.join(app.getPath('userData'), 'workspace');
    fs.mkdirSync(workspaceRoot, { recursive: true });
  }
}

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建文案',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-note');
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save');
          }
        },
        { type: 'separator' },
        {
          label: '选择工作区',
          click: async () => {
            try {
              const result = await dialog.showOpenDialog({
                title: '选择工作区文件夹',
                properties: ['openDirectory', 'createDirectory'],
                defaultPath: workspaceRoot,
              });
              
              if (!result.canceled && result.filePaths && result.filePaths[0]) {
                const newWorkspaceRoot = result.filePaths[0];
                workspaceRoot = newWorkspaceRoot;
                fs.mkdirSync(workspaceRoot, { recursive: true });
                
                // 保存新的工作区路径
                const cfgPath = path.join(app.getPath('userData'), 'workspace-config.json');
                try {
                  fs.writeFileSync(cfgPath, JSON.stringify({ path: workspaceRoot }, null, 2));
                } catch (e) {
                  console.error('保存工作区路径失败:', e);
                }
                
                // 通知渲染进程工作区已更改
                notifyWorkspaceOpened();
              }
            } catch (e) {
              console.error('选择工作区失败:', e);
            }
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 IdeaNote',
          click: () => {
            mainWindow?.webContents.send('menu:show-about');
          }
        }
      ]
    }
  ];

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: '关于 ' + app.getName() },
        { type: 'separator' },
        { role: 'services', label: '服务', submenu: [] },
        { type: 'separator' },
        { role: 'hide', label: '隐藏 ' + app.getName() },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出 ' + app.getName() }
      ]
    });

    // 窗口菜单
    const windowMenu = template.find(item => item.label === '窗口');
    if (windowMenu && windowMenu.submenu) {
      (windowMenu.submenu as Electron.MenuItemConstructorOptions[]) = [
        { role: 'close', label: '关闭' },
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { type: 'separator' },
        { role: 'front', label: '全部置于前面' }
      ];
    }
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'IdeaNote',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 允许加载本地资源
    },
  });
  
  // 创建应用菜单
  createApplicationMenu();
  
  // 在开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  // 直接加载本地 index.html 文件，跳过 dev server
  // 优先加载 dist 目录中的构建后的 index.html
  const distIndexHtml = path.join(__dirname, 'index.html');
  if (fs.existsSync(distIndexHtml)) {
    mainWindow.loadFile(distIndexHtml);
  } else {
    // 回退到上一级目录的 index.html（开发时）
    const indexHtml = path.join(__dirname, '..', 'index.html');
    if (fs.existsSync(indexHtml)) {
      mainWindow.loadFile(indexHtml);
    } else {
      // 如果仍然找不到，尝试从当前工作目录加载
      const rootIndexHtml = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(rootIndexHtml)) {
        mainWindow.loadFile(rootIndexHtml);
      } else {
        console.error('Could not find index.html in any expected location');
      }
    }
  }
}

function notifyWorkspaceOpened() {
  try {
    mainWindow?.webContents.send('workspace:opened', workspaceRoot);
  } catch (e) {
    console.warn('发送工作区打开事件失败:', e);
  }
}


function registerIpcHandlers() {
  // 仅确保工作区存在；所有文件系统 IPC 已在下方统一注册
  ensureWorkspace();
}

app.whenReady().then(async () => {
  // 不再自动弹出工作区选择对话框，让欢迎页面处理
  ensureWorkspace(); // 只确保有默认工作区
  initKBIndex();
  initKBVectorIndex();
  await rebuildKBIndex();
  // 取消启动时的向量全量重建，改为用户触发或按需重建，以避免启动阻塞
  createWindow();
  registerIpcHandlers();
  // 等待页面加载完成后通知渲染进程工作区路径，以触发数据刷新
  mainWindow?.webContents.on('did-finish-load', () => {
    notifyWorkspaceOpened();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  try {
    console.log('App is quitting...');
  } catch (e) {
    console.error('Error during before-quit:', e);
  }
});

// 列出当前工作区下的 JSON 文件（按名称升序）
ipcMain.handle('fs:listJsonFiles', async () => {
  try {
    if (!fs.existsSync(workspaceRoot)) return [];
    const files = fs.readdirSync(workspaceRoot, { withFileTypes: true });
    const list = files
      .filter(f => f.isFile() && f.name.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(workspaceRoot, f.name));
        return {
          id: f.name.replace(/\.json$/, ''),
          fileName: f.name,
          createdAt: new Date(stat.ctime).toISOString(),
          modifiedAt: new Date(stat.mtime).toISOString(),
          size: stat.size,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  } catch (e) {
    console.error('fs:listJsonFiles failed:', e);
    return [];
  }
});

// 选择工作区文件夹
ipcMain.handle('fs:selectWorkspace', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: '选择工作区文件夹',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: workspaceRoot,
    });
    
    if (!result.canceled && result.filePaths && result.filePaths[0]) {
      const newWorkspaceRoot = result.filePaths[0];
      workspaceRoot = newWorkspaceRoot;
      fs.mkdirSync(workspaceRoot, { recursive: true });
      // 更新 KB 目录并重建索引
      kbDir = path.join(workspaceRoot, '.kb');
      fs.mkdirSync(kbDir, { recursive: true });
      
      // 保存新的工作区路径
      const cfgPath = path.join(app.getPath('userData'), 'workspace-config.json');
      try {
        fs.writeFileSync(cfgPath, JSON.stringify({ path: workspaceRoot }, null, 2));
      } catch (e) {
        console.error('保存工作区路径失败:', e);
      }
      
      // 通知渲染进程工作区已更改
      notifyWorkspaceOpened();
      // 重建索引
      initKBIndex();
      await rebuildKBIndex();
      
      return { success: true, path: workspaceRoot };
    }
    
    return { success: false, error: 'User cancelled' };
  } catch (e) {
    console.error('fs:selectWorkspace failed:', e);
    return { success: false, error: String(e) };
  }
});

// 简化版：读取某个 JSON 文件的全部内容（字符串）
ipcMain.handle('fs:readJsonFile', async (_event, id: string) => {
  try {
    const jsonPath = path.join(workspaceRoot, `${id}.json`);
    if (!fs.existsSync(jsonPath)) return '';
    const raw = fs.readFileSync(jsonPath, 'utf8');
    return raw;
  } catch (e) {
    console.error('fs:readJsonFile failed:', e);
    return '';
  }
});

// 简化版：将右侧的 JSON 文本直接写回文件
ipcMain.handle('fs:writeJsonFile', async (_event, id: string, content: string) => {
  try {
    const jsonPath = path.join(workspaceRoot, `${id}.json`);
    // 校验 JSON 格式
    try { JSON.parse(content); } catch (e) {
      return { success: false, error: 'JSON 格式错误' } as any;
    }
    fs.writeFileSync(jsonPath, content, 'utf8');
    try { await updateKBIndexForId(id); } catch {}
    return { success: true };
  } catch (e) {
    console.error('fs:writeJsonFile failed:', e);
    return { success: false, error: String(e) } as any;
  }
});



// 文件系统：创建 JSON 文件（等价于插入 Copy）
ipcMain.handle('fs:createJsonFile', async (_event, copy: any) => {
  try {
    const dir = workspaceRoot;
    let base = sanitizeFileBase(copy.name || '新文案');
    let fileName = `${base}.json`;
    let idx = 2;
    while (fs.existsSync(path.join(dir, fileName))) {
      fileName = `${base}-${idx++}.json`;
    }
    const jsonPath = path.join(dir, fileName);
    const initialDoc = novelcopy(copy.name || base, '');
    const meta = {
      content: copy.content || JSON.stringify(initialDoc),
      status: copy.status || 'active',
      createdAt: new Date().toISOString(),
      richContent: copy.richContent || '',
      pptContent: copy.pptContent || '',
    };
    fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2), 'utf8');
    try { await updateKBIndexForId(fileName.replace(/\.json$/, '')); } catch {}
    return { success: true, fileName: fileName.replace(/\.json$/, '') };
  } catch (err) {
    console.error('Error fs:createJsonFile:', err);
    throw err;
  }
});

// 文件系统：重命名 JSON 文件
ipcMain.handle('fs:renameJsonFile', async (_event, oldId: string, newName: string) => {
  try {
    const oldPath = path.join(workspaceRoot, `${oldId}.json`);
    if (!fs.existsSync(oldPath)) {
      return { success: false, error: 'not_found' };
    }
    const desiredBase = sanitizeFileBase(newName || oldId);
    // 若无实际变化，直接返回，避免与自身文件路径冲突导致加后缀
    if (desiredBase === oldId) {
      return { success: true, id: oldId };
    }
    let finalBase = desiredBase;
    let newPath = path.join(workspaceRoot, `${finalBase}.json`);
    let idx = 2;
    // 仅在与其它现有文件冲突时追加后缀；若命中自身文件则不追加
    while (fs.existsSync(newPath)) {
      if (newPath === oldPath) {
        break;
      }
      finalBase = `${desiredBase}-${idx++}`;
      newPath = path.join(workspaceRoot, `${finalBase}.json`);
    }
    if (newPath === oldPath) {
      return { success: true, id: oldId };
    }
    fs.renameSync(oldPath, newPath);
    // 更新索引：移除旧ID，添加新ID
    try { deleteFromKBIndex(oldId); await updateKBIndexForId(finalBase); } catch {}
    return { success: true, id: finalBase };
  } catch (err) {
    console.error('Error fs:renameJsonFile:', err);
    throw err;
  }
});

// 文件系统：删除 JSON 文件
ipcMain.handle('fs:deleteJsonFile', async (_event, id: string) => {
  try {
    const jsonPath = path.join(workspaceRoot, `${id}.json`);
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }
    try { deleteFromKBIndex(id); } catch {}
    return { success: true };
  } catch (err) {
    console.error('Error fs:deleteJsonFile:', err);
    throw err;
  }
});

// 图片保存：将图片保存到工作目录的images文件夹
ipcMain.handle('fs:saveImage', async (_event, imageBuffer: Uint8Array, fileName: string) => {
  try {
    // 确保images文件夹存在
    const imagesDir = path.join(workspaceRoot, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });
    
    // 生成唯一的文件名
    const ext = path.extname(fileName) || '.png';
    const baseName = path.basename(fileName, ext);
    const sanitizedBaseName = sanitizeFileBase(baseName);
    
    let finalFileName = `${sanitizedBaseName}${ext}`;
    let finalPath = path.join(imagesDir, finalFileName);
    let counter = 1;
    
    // 如果文件已存在，添加数字后缀
    while (fs.existsSync(finalPath)) {
      finalFileName = `${sanitizedBaseName}-${counter}${ext}`;
      finalPath = path.join(imagesDir, finalFileName);
      counter++;
    }
    
    // 将Uint8Array转换为Buffer并保存图片文件
    const buffer = Buffer.from(imageBuffer);
    fs.writeFileSync(finalPath, buffer);
    
    // 返回file://协议的绝对路径，用于在编辑器中引用
    const fileUrl = `file://${finalPath}`;
    
    
    return { 
      success: true, 
      fileName: finalFileName,
      relativePath: fileUrl,
      fullPath: finalPath
    };
  } catch (err) {
    console.error('Error fs:saveImage:', err);
    return { 
      success: false, 
      error: String(err) 
    };
  }
});

// ================= KB 索引与 IPC =================
function initKBIndex() {
  // 仅从磁盘载入现有索引到内存，不使用第三方索引
  try {
    const idxPath = path.join(kbDir, 'index.json');
    if (fs.existsSync(idxPath)) {
      const raw = fs.readFileSync(idxPath, 'utf8');
      const obj = JSON.parse(raw || '{}');
      if (Array.isArray(obj?.docs)) {
        kbIndexData = { version: 1, docs: obj.docs };
      } else {
        kbIndexData = { version: 1, docs: [] };
      }
    } else {
      kbIndexData = { version: 1, docs: [] };
    }
  } catch (e) {
    console.warn('Load KB index failed:', e);
    kbIndexData = { version: 1, docs: [] };
  }
}

function initKBVectorIndex() {
  // 加载向量索引（若存在）
  try {
    const vecPath = path.join(kbDir, 'vectors.json');
    if (fs.existsSync(vecPath)) {
      const raw = fs.readFileSync(vecPath, 'utf8');
      const obj = JSON.parse(raw || '{}');
      if (Array.isArray(obj?.items)) {
        kbVectorData = { version: 1, items: obj.items };
      } else {
        kbVectorData = { version: 1, items: [] };
      }
    } else {
      kbVectorData = { version: 1, items: [] };
    }
  } catch (e) {
    console.warn('Load KB vector index failed:', e);
    kbVectorData = { version: 1, items: [] };
  }
}

async function rebuildKBIndex() {
  try {
    if (!fs.existsSync(workspaceRoot)) return;
    const files = fs.readdirSync(workspaceRoot, { withFileTypes: true })
      .filter(f => f.isFile() && f.name.endsWith('.json'))
      .map(f => f.name.replace(/\.json$/, ''));
    kbIndexData.docs = [];
    for (const id of files) {
      await updateKBIndexForId(id);
    }
    saveKBIndex();
  } catch (e) {
    console.error('rebuildKBIndex failed:', e);
  }
}

function saveKBIndex() {
  try {
    const idxPath = path.join(kbDir, 'index.json');
    fs.writeFileSync(idxPath, JSON.stringify({ version: 1, docs: kbIndexData.docs }, null, 2), 'utf8');
  } catch (e) {
    console.error('saveKBIndex failed:', e);
  }
}

function saveKBVectorIndex() {
  try {
    const vecPath = path.join(kbDir, 'vectors.json');
    fs.writeFileSync(vecPath, JSON.stringify({ version: 1, items: kbVectorData.items }, null, 2), 'utf8');
  } catch (e) {
    console.error('saveKBVectorIndex failed:', e);
  }
}

async function updateKBIndexForId(id: string) {
  try {
    const jsonPath = path.join(workspaceRoot, `${id}.json`);
    if (!fs.existsSync(jsonPath)) return;
    const raw = fs.readFileSync(jsonPath, 'utf8');
    let meta: any = {};
    try { meta = JSON.parse(raw || '{}'); } catch {}
    const markdownStr = typeof meta.richContent === 'string' ? meta.richContent : '';
    // 仅使用 richContent 作为全文内容，不再对节点进行转换或合并
    const doc: KBDoc = buildKBDoc(id, markdownStr);
    const idx = kbIndexData.docs.findIndex(d => d.id === id);
    if (idx >= 0) kbIndexData.docs[idx] = doc; else kbIndexData.docs.push(doc);
    saveKBIndex();
  } catch (e) {
    console.error('updateKBIndexForId failed:', e);
  }
}

// ---- 向量索引与搜索 ----
let embeddingPipeline: any | null = null;

// 通过国内镜像拉取并缓存到本地模型目录
async function ensureLocalModelFromMirror(localModelDir: string) {
  try {
    // 需要的文件列表
    const files = [
      {
        url: 'https://hf-mirror.com/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json',
        path: path.join(localModelDir, 'tokenizer.json'),
      },
      {
        url: 'https://hf-mirror.com/Xenova/all-MiniLM-L6-v2/resolve/main/config.json',
        path: path.join(localModelDir, 'config.json'),
      },
      {
        url: 'https://hf-mirror.com/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx',
        path: path.join(localModelDir, 'onnx', 'model.onnx'),
      },
    ];

    // 创建目录
    try { fs.mkdirSync(localModelDir, { recursive: true }); } catch {}
    try { fs.mkdirSync(path.join(localModelDir, 'onnx'), { recursive: true }); } catch {}

    // 统计总大小（若支持）
    let totalAll = 0;
    let downloadedAll = 0;
    const sizes: Record<string, number> = {};
    for (const f of files) {
      try {
        const head = await fetch(f.url, { method: 'HEAD' });
        const len = Number(head.headers.get('content-length') || 0);
        sizes[f.path] = len || 0;
        totalAll += fs.existsSync(f.path) ? (len || 0) : (len || 0);
        if (fs.existsSync(f.path)) downloadedAll += len || 0;
      } catch {}
    }
    broadcast('kb:modelDownload', { type: 'start', totalAll, downloadedAll });

    const download = async (url: string, filePath: string) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = (res.body as any).getReader?.();
        const ws = fs.createWriteStream(filePath);
        let received = 0;
        const total = sizes[filePath] || 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              ws.write(Buffer.from(value));
              received += value.length || 0;
              downloadedAll += value.length || 0;
              broadcast('kb:modelDownload', {
                type: 'progress',
                file: path.basename(filePath),
                receivedFile: received,
                totalFile: total,
                downloadedAll,
                totalAll,
                percentAll: totalAll ? Math.round((downloadedAll / totalAll) * 100) : undefined,
              });
            }
          }
        } else {
          const buf = await res.arrayBuffer();
          ws.write(Buffer.from(buf));
          received = buf.byteLength || 0;
          downloadedAll += received;
          broadcast('kb:modelDownload', {
            type: 'progress',
            file: path.basename(filePath),
            receivedFile: received,
            totalFile: total,
            downloadedAll,
            totalAll,
            percentAll: totalAll ? Math.round((downloadedAll / totalAll) * 100) : undefined,
          });
        }
        ws.end();
        return true;
      } catch (err) {
        console.warn('下载失败（镜像）', url, err);
        return false;
      }
    };

    let allOK = true;
    for (const f of files) {
      if (!fs.existsSync(f.path)) {
        const ok = await download(f.url, f.path);
        if (!ok) allOK = false;
      }
    }
    broadcast('kb:modelDownload', { type: 'done', totalAll, downloadedAll });
    return allOK;
  } catch (e) {
    console.warn('ensureLocalModelFromMirror 失败:', e);
    return false;
  }
}

function createLocalEmbeddingPipeline(dim: number = 384) {
  // 纯本地哈希嵌入：无需网络，适合作为回退方案
  // 基于简单的 token 哈希桶 + 词频，最后进行 L2 归一化
  const D = Math.max(16, dim | 0);
  function hashToken(t: string) {
    let h = 2166136261 >>> 0; // FNV-like
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      h >>>= 0;
    }
    return h >>> 0;
  }
  function embed(text: string) {
    const vec = new Array<number>(D).fill(0);
    const normText = (text || '').toLowerCase();
    const tokens = normText.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    for (const tok of tokens) {
      const h = hashToken(tok);
      const idx = h % D;
      vec[idx] += 1; // TF 权重，可后续扩展为 TF-IDF
    }
    // 归一化
    let sum = 0;
    for (let i = 0; i < D; i++) sum += vec[i] * vec[i];
    const denom = Math.sqrt(sum) || 1;
    for (let i = 0; i < D; i++) vec[i] = vec[i] / denom;
    return vec;
  }
  return async (input: string, opts?: any) => {
    const v = embed(input);
    // 与 transformers.pipeline 输出结构对齐
    return { data: [v] };
  };
}

async function ensureEmbeddingPipeline() {
  if (embeddingPipeline) return embeddingPipeline;
  // 优先尝试在线模型（如可用）；设置缓存目录，避免重复下载
  try {
    const cacheDir = path.join(app.getPath('userData'), 'hf-cache');
    const homeDir = path.join(app.getPath('userData'), 'hf-home');
    try { fs.mkdirSync(cacheDir, { recursive: true }); } catch {}
    try { fs.mkdirSync(homeDir, { recursive: true }); } catch {}
    process.env.TRANSFORMERS_CACHE = cacheDir;
    process.env.HF_HOME = homeDir;
    // 强制使用国内镜像，避免默认走官方域名
    process.env.HF_HUB_URL = 'https://hf-mirror.com';
    process.env.HF_ENDPOINT = process.env.HF_HUB_URL;

    const mod = await import('@xenova/transformers');
    // 若本地已预下载模型，则优先本地目录，避免网络请求
    const localModelDir = path.join(app.getPath('userData'), 'models', 'all-MiniLM-L6-v2');
    // 如缺少文件，尝试从镜像下载到本地目录
    await ensureLocalModelFromMirror(localModelDir);
    const modelIdOrPath = fs.existsSync(localModelDir) ? localModelDir : 'Xenova/all-MiniLM-L6-v2';
    const pipe = await (mod as any).pipeline('feature-extraction', modelIdOrPath);
    embeddingPipeline = pipe;
    return embeddingPipeline;
  } catch (e) {
    console.error('Failed to initialize embedding pipeline, switching to offline fallback:', e);
    // 回退到本地哈希嵌入，保证功能可用
    embeddingPipeline = createLocalEmbeddingPipeline(384);
    return embeddingPipeline;
  }
}

let TextSplitterClass: any | null = null;
async function ensureTextSplitter() {
  if (TextSplitterClass) return TextSplitterClass;
  try {
    const mod = await import('@langchain/textsplitters');
    TextSplitterClass = (mod as any).RecursiveCharacterTextSplitter;
    return TextSplitterClass;
  } catch (e) {
    console.error('Failed to load text splitter:', e);
    throw e;
  }
}

async function indexVectorsForId(id: string) {
  try {
    const jsonPath = path.join(workspaceRoot, `${id}.json`);
    if (!fs.existsSync(jsonPath)) return;
    const raw = fs.readFileSync(jsonPath, 'utf8');
    let meta: any = {};
    try { meta = JSON.parse(raw || '{}'); } catch {}
    const markdownStr = typeof meta.richContent === 'string' ? meta.richContent : '';
    const Splitter = await ensureTextSplitter();
    const splitter = new Splitter({ chunkSize: 800, chunkOverlap: 100 });
    const chunks: Array<string | { pageContent: string }> = await splitter.splitText(markdownStr);

    const pipe = await ensureEmbeddingPipeline();

    // 删除旧向量
    kbVectorData.items = kbVectorData.items.filter(it => it.id !== id);

    let chunkIndex = 0;
    for (const chunk of chunks) {
      const content = typeof chunk === 'string' ? chunk : (chunk?.pageContent || '');
      if (!content) { chunkIndex++; continue; }
      try {
        const out = await pipe(content, { pooling: 'mean', normalize: true });
        const vec = ensureNumberArray(out?.data?.[0]);
        kbVectorData.items.push({ id, chunkIndex, content, vector: vec });
      } catch (e) {
        console.warn(`Embedding failed for ${id}#${chunkIndex}:`, e);
      }
      chunkIndex++;
    }
    saveKBVectorIndex();
  } catch (e) {
    console.error('indexVectorsForId failed:', e);
  }
}

async function rebuildVectorIndex() {
  try {
    if (!fs.existsSync(workspaceRoot)) return;
    const files = fs.readdirSync(workspaceRoot, { withFileTypes: true })
      .filter(f => f.isFile() && f.name.endsWith('.json'))
      .map(f => f.name.replace(/\.json$/, ''));
    kbVectorData.items = [];
    for (const id of files) {
      await indexVectorsForId(id);
    }
    saveKBVectorIndex();
  } catch (e) {
    console.error('rebuildVectorIndex failed:', e);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ai = a[i], bi = b[i];
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

function ensureNumberArray(iter: any): number[] {
  try {
    const arr = Array.from((iter as Iterable<any>) ?? []);
    return arr.map((x) => (typeof x === 'number' ? x : Number(x)));
  } catch {
    return [];
  }
}

async function vectorSearch(query: string, topN: number = 3): Promise<Array<{ id: string; score: number; content: string }>> {
  const q = String(query || '').trim();
  if (!q) return [];
  const pipe = await ensureEmbeddingPipeline();
  try {
    const out = await pipe(q, { pooling: 'mean', normalize: true });
    const qvec: number[] = ensureNumberArray(out?.data?.[0]);
    const scored = kbVectorData.items.map(it => ({ id: it.id, content: it.content, score: cosineSimilarity(qvec, it.vector) }));
    return scored.sort((a, b) => b.score - a.score).slice(0, topN);
  } catch (e) {
    console.error('vectorSearch failed:', e);
    return [];
  }
}

function deleteFromKBIndex(id: string) {
  kbIndexData.docs = kbIndexData.docs.filter(d => d.id !== id);
  saveKBIndex();
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeSnippet(text: string, q: string): { snippet: string; snippetHtml: string } {
  const haystack = String(text || '');
  const lower = haystack.toLowerCase();
  const idx = lower.indexOf(q);
  const windowSize = 80; // 片段左右各取80字符
  if (idx === -1) {
    const base = haystack.slice(0, windowSize);
    const esc = escapeHtml(base);
    return { snippet: base, snippetHtml: esc };
  }
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(haystack.length, idx + q.length + windowSize);
  let base = haystack.slice(start, end);
  // 添加省略号
  if (start > 0) base = '… ' + base;
  if (end < haystack.length) base = base + ' …';
  const esc = escapeHtml(base);
  const qRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const highlighted = esc.replace(qRegex, '<mark>$&</mark>');
  return { snippet: base, snippetHtml: highlighted };
}

function searchKB(query: string): Array<{ id: string; title?: string; snippet?: string; snippetHtml?: string }> {
  // 纯文本搜索：不使用分词与索引，仅对子串进行大小写不敏感匹配，并返回片段与高亮
  const qRaw = String(query || '').trim();
  const q = qRaw.toLowerCase();
  if (!q) return [];
  try {
    const results = kbIndexData.docs
      .filter(d => {
        const title = String(d.title || '').toLowerCase();
        const text = String(d.text || '').toLowerCase();
        return title.includes(q) || text.includes(q);
      })
      .map(d => {
        const titleStr = String(d.title || '');
        const textStr = String(d.text || '');
        const titleLower = titleStr.toLowerCase();
        const inTitle = titleLower.includes(q);
        const { snippet, snippetHtml } = inTitle
          ? makeSnippet(titleStr, q)
          : makeSnippet(textStr, q);
        return { id: d.id, title: d.title, snippet, snippetHtml };
      });
    return results;
  } catch (e) {
    console.error('searchKB failed:', e);
    return [];
  }
}


ipcMain.handle('kb:indexAll', async () => {
  try { await rebuildKBIndex(); return { success: true, count: kbIndexData.docs.length }; }
  catch (e) { return { success: false, error: String(e) }; }
});

ipcMain.handle('kb:updateIndex', async (_e, id: string) => {
  try { await updateKBIndexForId(id); return { success: true }; }
  catch (e) { return { success: false, error: String(e) }; }
});

ipcMain.handle('kb:search', async (_e, query: string) => {
  try { return searchKB(query); } catch { return []; }
});

ipcMain.handle('kb:indexVectors', async () => {
  try { await rebuildVectorIndex(); return { success: true, count: kbVectorData.items.length }; }
  catch (e) { return { success: false, error: String(e) }; }
});

ipcMain.handle('kb:vectorSearch', async (_e, query: string, topN: number = 3) => {
  try { return await vectorSearch(query, topN); } catch { return []; }
});

ipcMain.handle('kb:answer', async (_e, question: string, topN: number = 3) => {
  try {
    // 首次使用若无向量索引，则自动重建一次，避免每次都为空
    if (!kbVectorData.items || kbVectorData.items.length === 0) {
      await rebuildVectorIndex();
    }
    const results = await vectorSearch(question, topN);
    const context = results.map(r => r.content).join('\n');
    const prompt = `基于以下上下文回答问题：\n${context}\n问题：${question}\n回答：`;
    return { success: true, context, prompt, results };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});


// 通用媒体文件保存：将音频、视频等媒体文件保存到对应的文件夹
ipcMain.handle('fs:saveMedia', async (_event, mediaBuffer: Uint8Array, fileName: string, mediaType: 'video' | 'audio' | 'image') => {
  try {
    // 根据媒体类型确定保存目录
    const mediaDir = path.join(workspaceRoot, 'media', `${mediaType}s`);
    fs.mkdirSync(mediaDir, { recursive: true });
    
    // 生成唯一的文件名
    const ext = path.extname(fileName) || (mediaType === 'video' ? '.mp4' : mediaType === 'audio' ? '.mp3' : '.png');
    const baseName = path.basename(fileName, ext);
    const sanitizedBaseName = sanitizeFileBase(baseName);
    
    let finalFileName = `${sanitizedBaseName}${ext}`;
    let finalPath = path.join(mediaDir, finalFileName);
    let counter = 1;
    
    // 如果文件已存在，添加数字后缀
    while (fs.existsSync(finalPath)) {
      finalFileName = `${sanitizedBaseName}-${counter}${ext}`;
      finalPath = path.join(mediaDir, finalFileName);
      counter++;
    }
    
    // 将Uint8Array转换为Buffer并保存媒体文件
    const buffer = Buffer.from(mediaBuffer);
    fs.writeFileSync(finalPath, buffer);
    
    // 返回file://协议的绝对路径，用于在编辑器中引用
    const fileUrl = `file://${finalPath}`;
    
    return { 
      success: true, 
      fileName: finalFileName,
      relativePath: fileUrl,
      fullPath: finalPath
    };
  } catch (err) {
    console.error(`Error fs:saveMedia (${mediaType}):`, err);
    return { 
      success: false, 
      error: String(err) 
    };
  }
});

// 选择媒体文件：允许用户选择音频或视频文件，返回文件路径
ipcMain.handle('fs:selectMediaFile', async (_event, mediaType: 'video' | 'audio') => {
  try {
    const filters = mediaType === 'video' 
      ? [
          { name: '视频文件', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      : [
          { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'webm', 'flac'] },
          { name: '所有文件', extensions: ['*'] }
        ];

    const result = await dialog.showOpenDialog({
      title: `选择${mediaType === 'video' ? '视频' : '音频'}文件`,
      properties: ['openFile'],
      filters: filters
    });
    
    if (!result.canceled && result.filePaths && result.filePaths[0]) {
      const selectedPath = result.filePaths[0];
      
      // 验证文件是否存在
      if (!fs.existsSync(selectedPath)) {
        return { 
          success: false, 
          error: '文件不存在' 
        };
      }
      
      // 返回file://协议的绝对路径，用于在编辑器中引用
      const fileUrl = `file://${selectedPath}`;
      
      return { 
        success: true, 
        filePath: selectedPath,
        fileUrl: fileUrl,
        fileName: path.basename(selectedPath)
      };
    }
    
    return { 
      success: false, 
      error: '用户取消了选择' 
    };
  } catch (err) {
    console.error(`Error fs:selectMediaFile (${mediaType}):`, err);
    return { 
      success: false, 
      error: String(err) 
    };
  }
});

// API Key 安全存储管理
ipcMain.handle('settings:getApiKey', async (_event, model: string = 'deepseek') => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath);
    
    // 兼容旧版本：如果没有指定model参数，使用默认的encryptedApiKey
    if (!model && config && config.encryptedApiKey) {
      const decrypted = safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'));
      return { success: true, apiKey: decrypted };
    }
    
    // 新逻辑：支持模型特定的API Key
    const storageKey = `encryptedApiKey_${model}`;
    if (config && config[storageKey]) {
      const decrypted = safeStorage.decryptString(Buffer.from(config[storageKey], 'base64'));
      return { success: true, apiKey: decrypted };
    }
    
    return { success: true, apiKey: '' };
  } catch (err) {
    console.error(`Error getting API key for model ${model}:`, err);
    return { success: false, error: String(err) };
  }
});

// 打开文件夹：使用系统文件浏览器打开指定路径
ipcMain.handle('fs:openFolder', async (_event, folderPath: string) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return { success: false, error: '文件夹路径不存在' };
    }
    
    // 使用 electron 的 shell 模块打开文件夹
    const { shell } = require('electron');
    await shell.openPath(folderPath);
    
    return { success: true };
  } catch (err) {
    console.error('Error fs:openFolder:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('settings:setApiKey', async (_event, apiKey: string, model: string = 'deepseek') => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath) || {};
    
    if (apiKey.trim() === '') {
      // 删除模型特定的 API Key
      const storageKey = `encryptedApiKey_${model}`;
      delete config[storageKey];
      
      // 兼容旧版本：如果删除的是默认模型，也删除旧的encryptedApiKey
      if (model === 'deepseek') {
        delete config.encryptedApiKey;
      }
      
      writeJsonSafe(configPath, config);
      return { success: true };
    }
    
    // 加密并存储模型特定的 API Key
    const encrypted = safeStorage.encryptString(apiKey);
    const storageKey = `encryptedApiKey_${model}`;
    config[storageKey] = encrypted.toString('base64');
    
    writeJsonSafe(configPath, config);
    return { success: true };
  } catch (err) {
    console.error(`Error setting API key for model ${model}:`, err);
    return { success: false, error: String(err) };
  }
});

// 获取模型选择
ipcMain.handle('settings:getModel', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath);
    return config?.selectedModel || 'deepseek';
  } catch (err) {
    console.error('Error getting model:', err);
    return 'deepseek';
  }
});

// 设置模型选择
ipcMain.handle('settings:setModel', async (_event, model: string) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath) || {};
    config.selectedModel = model;
    writeJsonSafe(configPath, config);
    return { success: true };
  } catch (err) {
    console.error('Error setting model:', err);
    return { success: false, error: String(err) };
  }
});

// AI 生成：处理 AI 文本生成请求
ipcMain.handle('ai:generate', async (_event, prompt: string, option: string, command?: string) => {
  try {
    // 从安全存储中获取 API Key 和模型选择
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath);
    
    // 获取选择的模型
    const selectedModel = config?.selectedModel || 'deepseek';
    
    let apiKey = '';
    // 优先使用模型特定的 API Key
    const storageKey = `encryptedApiKey_${selectedModel}`;
    if (config && config[storageKey]) {
      try {
        apiKey = safeStorage.decryptString(Buffer.from(config[storageKey], 'base64'));
      } catch (decryptErr) {
        console.error(`Failed to decrypt API key for model ${selectedModel}:`, decryptErr);
      }
    } else if (config && config.encryptedApiKey) {
      // 兼容旧版本：如果没有模型特定的 key，使用默认的
      try {
        apiKey = safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'));
      } catch (decryptErr) {
        console.error('Failed to decrypt default API key:', decryptErr);
      }
    }
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("请先在设置中配置 API Key");
    }
    
    // 模型配置
    const modelConfig = {
      deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        errorPrefix: 'DeepSeek API'
      },
      // openai: {
      //   endpoint: 'https://api.openai.com/v1/chat/completions',
      //   model: 'gpt-3.5-turbo',
      //   errorPrefix: 'OpenAI API'
      // },
      qwen3: {
        endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        model: 'qwen3-max',
        errorPrefix: 'Qwen3 API'
      }
    };
    
    const currentConfig = modelConfig[selectedModel as keyof typeof modelConfig];

    const BASE_ROLE = "你是youtube视频博主，拥有百万粉丝账号操盘经验.";
    const COMMON_REQUIREMENTS = 
      "◆ 始终使用口语化表达\n" + 
      "◆ 采用「悬念前置+信息密度」结构\n" + 
      "◆ 每15秒设置一个剧情钩子\n";

    let systemContent = "";
    let userContent = "";

    switch (option) {
      case "generate":
        systemContent = BASE_ROLE + 
          "根据现有内容写一篇完整的文案\n" + 
          "▼ 核心要求\n" + 
          "● 首行必须生成3个爆款标题选项（emoji+数字标题）\n" + 
          "● 后半段优先安排转化触发点\n" + 
          "● 结尾预留互动话术接口\n";
        userContent = prompt;
        break;
      case "qa":
        // 知识库问答：使用提供的上下文回答问题，避免虚构
        systemContent = "你是一个严谨的知识库问答助手。\n" +
          "- 仅根据提供的上下文回答问题；\n" +
          "- 若上下文没有答案，请明确说明‘根据当前上下文无法回答’；\n" +
          "- 保持回答简洁，必要时使用项目符号或保持换行；";
        userContent = prompt;
        break;
      case "improve":
        systemContent = BASE_ROLE + 
          "根据输入的文稿进行文本润色，要求文本正式，内容精简严肃，抓住用户痛点吸引用户观看，只返回处理后的文稿。";
        userContent = `现有文本是：${prompt}`;
        break;
      case "shorter":
        systemContent = BASE_ROLE + 
          "根据输入的文稿进行高质量文本摘要，只返回处理后内容。";
        userContent = `现有文本是：${prompt}`;
        break;
      case "longer":
        systemContent = BASE_ROLE + 
          "根据输入的文稿进行文本续写，要求文本正式，内容精简严肃，只返回续写的内容。";
        userContent = `现有文本是：${prompt}`;
        break;
      case "fix":
        systemContent = BASE_ROLE + 
          "润色文案,修复语法和拼写错误，返回需要修改语法和拼写的点，无需返回完整文本\n";
        userContent = `现有文本是：${prompt}`;
        break;
      case "zap":
        systemContent = BASE_ROLE + 
          "根据输入的文稿和要求进行文本修改" + 
          "在适当的时候使用Markdown格式。";
        userContent = `对于这段文本：${prompt}。你必须遵守这些要求：${command}`;
        break;
      default:
        throw new Error("Unknown option: " + option);
    }

    const messages = [
      { role: "system", content: systemContent },
      { role: "user", content: userContent }
    ];

    // 使用 fetch 调用相应的 API (流式响应)
    let response;
    
    // 所有模型现在都使用 OpenAI 兼容格式
    response = await fetch(currentConfig.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentConfig.model,
        stream: true,
        temperature: 1.2,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`${currentConfig.errorPrefix} error: ${response.status} ${response.statusText}`);
    }

    // 返回流式响应的 ReadableStream
    return {
      success: true,
      stream: response.body
    };
  } catch (err) {
    console.error('Error ai:generate:', err);
    return { 
      success: false, 
      error: String(err) 
    };
  }
});

// 流式AI生成处理器 - 参考Next.js简化版本
ipcMain.handle('ai:generateStream', async (event, prompt: string, option: string, command?: string) => {
  try {
    // 获取API密钥和模型选择
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath);
    
    // 获取选择的模型
    const selectedModel = config?.selectedModel || 'deepseek';
    
    let apiKey = '';
    // 优先使用模型特定的 API Key
    const storageKey = `encryptedApiKey_${selectedModel}`;
    if (config && config[storageKey]) {
      apiKey = safeStorage.decryptString(Buffer.from(config[storageKey], 'base64'));
    } else if (config && config.encryptedApiKey) {
      // 兼容旧版本：如果没有模型特定的 key，使用默认的
      apiKey = safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'));
    }
    
    if (!apiKey) {
      throw new Error("请先在设置中配置 API Key");
    }
    
    // 模型配置
    const modelConfig = {
      deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        errorPrefix: 'DeepSeek API'
      },
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo',
        errorPrefix: 'OpenAI API'
      },
      qwen3: {
        endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        model: 'qwen3-32b',
        errorPrefix: 'Qwen3 API'
      }
    };
    
    const currentConfig = modelConfig[selectedModel as keyof typeof modelConfig];

    const BASE_ROLE = "你是youtube视频博主，拥有百万粉丝账号操盘经验.";
    
    const messageMap = {
      generate: { role: "system", content: BASE_ROLE + "根据现有内容写一篇完整的文案\n▼ 核心要求\n● 首行必须生成3个爆款标题选项（emoji+数字标题）\n● 后半段优先安排转化触发点\n● 结尾预留互动话术接口\n" },
      improve: { role: "system", content: BASE_ROLE + "根据输入的文稿进行文本润色，要求文本正式，内容精简严肃，抓住用户痛点吸引用户观看，只返回处理后的文稿。" },
      shorter: { role: "system", content: BASE_ROLE + "根据输入的文稿进行高质量文本摘要，只返回处理后内容。" },
      longer: { role: "system", content: BASE_ROLE + "根据输入的文稿进行文本续写，要求文本正式，内容精简严肃，只返回续写的内容。" },
      fix: { role: "system", content: BASE_ROLE + "润色文案,修复语法和拼写错误，返回需要修改语法和拼写的点，无需返回完整文本\n" },
      zap: { role: "system", content: BASE_ROLE + "根据输入的文稿和要求进行文本修改在适当的时候使用Markdown格式。" },
      qa: { role: "system", content: "你是一个严谨的知识库问答助手。仅根据提供的上下文回答问题；若上下文没有答案，请明确说明；保持回答简洁，必要时使用项目符号或保持换行。" }
    };

    const systemMessage = messageMap[option as keyof typeof messageMap] || messageMap.generate;
    const userContent = option === 'zap' ? `对于这段文本：${prompt}。你必须遵守这些要求：${command}` : 
                       option === 'qa' ? prompt : 
                       option === 'generate' ? prompt : `现有文本是：${prompt}`;

    // 使用类似OpenAI SDK的方式调用API
    let response;
    
    // 所有模型现在都使用 OpenAI 兼容格式
    response = await fetch(currentConfig.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentConfig.model,
        stream: true,
        temperature: 1.2,
        messages: [systemMessage, { role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      throw new Error(`${currentConfig.errorPrefix} error: ${response.status}`);
    }

    // 简化的流处理 - 参考Next.js ReadableStream模式
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          event.sender.send('ai:streamComplete');
          break;
        }

        // 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        
        // 直接处理整个chunk，不要按行分割以避免丢失换行符
        if (chunk.includes('data: ')) {
          // 按SSE格式分割，但保留原始内容的换行符
          const sseEvents = chunk.split(/(?=data: )/);
          
          for (const sseEvent of sseEvents) {
             if (!sseEvent.trim() || !sseEvent.startsWith('data: ')) continue;
             
             const data = sseEvent.slice(6).trim();
             if (data === '[DONE]') {
               event.sender.send('ai:streamComplete');
               return { success: true };
             }
             
             try {
               const parsed = JSON.parse(data);
               const content = parsed.choices?.[0]?.delta?.content || '';
               if (content) {
                 // 添加日志来查看原始内容格式
                //  console.log('🔍 原始chunk内容:', JSON.stringify(content));
                //  console.log('🔍 chunk长度:', content.length);
                //  console.log('🔍 包含换行符:', content.includes('\n'));
                //  console.log('🔍 包含markdown符号:', /[#*`_\-\[\]]/g.test(content));
                //  console.log('🔍 完整内容预览:', content.replace(/\n/g, '\\n'));
                //  console.log('---');
                 
                 // 确保换行符被正确保留
                 event.sender.send('ai:streamChunk', content);
               }
             } catch (parseErr) {
               // 静默忽略解析错误
               continue;
             }
           }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return { success: true };
  } catch (err) {
    event.sender.send('ai:streamError', String(err));
    return { success: false, error: String(err) };
  }
});
