import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { novelcopy } from './lib/copyContent';

if (started) {
  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  app.quit();
}

let workspaceRoot: string;
let mainWindow: BrowserWindow | null = null;

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

// 规范化并修复历史 JSON 元数据文件的字段类型
const normalizeMetaFile = (jsonPath: string, meta: any) => {
  const m = { ...meta };
  let changed = false;

  // content 必须为字符串（JSON 字符串）
  if (typeof m.content !== 'string') {
    if (m.content && typeof m.content === 'object') {
      try {
        m.content = JSON.stringify(m.content);
      } catch {
        m.content = '';
      }
      changed = true;
    } else {
      m.content = String(m.content || '');
      changed = true;
    }
  }

  // richContent 必须为字符串（Markdown），若误存了 doc，则迁移到 content
  if (typeof m.richContent !== 'string') {
    if (m.richContent && typeof m.richContent === 'object') {
      const docLike = m.richContent && m.richContent.type === 'doc';
      if (docLike) {
        // 若 content 为空，则将 doc 迁移到 content
        if (!m.content || !String(m.content).trim()) {
          try {
            m.content = JSON.stringify(m.richContent);
          } catch {}
        }
        m.richContent = '';
        changed = true;
      } else {
        // 非 doc 的对象，保底转为字符串
        try {
          m.richContent = JSON.stringify(m.richContent);
        } catch {
          m.richContent = '';
        }
        changed = true;
      }
    } else {
      m.richContent = String(m.richContent || '');
      changed = true;
    }
  }

  // createdAt 统一为 ISO 字符串
  if (typeof m.createdAt !== 'string') {
    if (m.createdAt?.toISOString) {
      m.createdAt = m.createdAt.toISOString();
    } else if (!m.createdAt) {
      m.createdAt = new Date().toISOString();
    } else {
      m.createdAt = String(m.createdAt);
    }
    changed = true;
  }

  if (changed) writeJsonSafe(jsonPath, m);
  return m;
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 允许加载本地资源
    },
  });
  
  // 在开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  // 在开发环境下，通常由前端 dev server 提供页面
  // 若未运行 dev server，可回退到加载本地文件
  const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  try {
    mainWindow.loadURL(devUrl);
  } catch {
    const indexHtml = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexHtml)) {
      mainWindow.loadFile(indexHtml);
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

function findCopyById(id: string): { metaPath: string } | null {
  const metaPath = path.join(workspaceRoot, `${id}.json`);
  if (fs.existsSync(metaPath)) {
    return { metaPath };
  }
  return null;
}

function registerIpcHandlers() {
  // 仅确保工作区存在；所有文件系统 IPC 已在下方统一注册
  ensureWorkspace();
}

app.whenReady().then(async () => {
  await initializeWorkspaceWithPrompt();
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
    return { success: true };
  } catch (err) {
    console.error('Error fs:deleteJsonFile:', err);
    throw err;
  }
});
