import { app, BrowserWindow, ipcMain, Menu, dialog, safeStorage } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'node:fs';
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

// API Key 安全存储管理
ipcMain.handle('settings:getApiKey', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath);
    
    if (config && config.encryptedApiKey) {
      // 解密存储的 API Key
      const decrypted = safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'));
      return { success: true, apiKey: decrypted };
    }
    
    return { success: true, apiKey: '' };
  } catch (err) {
    console.error('Error getting API key:', err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('settings:setApiKey', async (_event, apiKey: string) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    
    if (apiKey.trim() === '') {
      // 删除 API Key
      const config = readJsonSafe(configPath) || {};
      delete config.encryptedApiKey;
      writeJsonSafe(configPath, config);
      return { success: true };
    }
    
    // 加密并存储 API Key
    const encrypted = safeStorage.encryptString(apiKey);
    const config = readJsonSafe(configPath) || {};
    config.encryptedApiKey = encrypted.toString('base64');
    
    writeJsonSafe(configPath, config);
    return { success: true };
  } catch (err) {
    console.error('Error setting API key:', err);
    return { success: false, error: String(err) };
  }
});

// AI 生成：处理 AI 文本生成请求
ipcMain.handle('ai:generate', async (_event, prompt: string, option: string, command?: string) => {
  try {
    // 从安全存储中获取 API Key
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath);
    
    let apiKey = '';
    if (config && config.encryptedApiKey) {
      try {
        apiKey = safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'));
      } catch (decryptErr) {
        console.error('Failed to decrypt API key:', decryptErr);
      }
    }
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error("请先在设置中配置 DeepSeek API Key");
    }

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

    // 使用 fetch 调用 DeepSeek API (流式响应)
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: true,
        temperature: 1.2,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
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
    // 获取API密钥
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = readJsonSafe(configPath);
    
    let apiKey = '';
    if (config && config.encryptedApiKey) {
      apiKey = safeStorage.decryptString(Buffer.from(config.encryptedApiKey, 'base64'));
    }
    
    if (!apiKey) {
      throw new Error("请先在设置中配置 DeepSeek API Key");
    }

    const BASE_ROLE = "你是youtube视频博主，拥有百万粉丝账号操盘经验.";
    
    const messageMap = {
      generate: { role: "system", content: BASE_ROLE + "根据现有内容写一篇完整的文案\n▼ 核心要求\n● 首行必须生成3个爆款标题选项（emoji+数字标题）\n● 后半段优先安排转化触发点\n● 结尾预留互动话术接口\n" },
      improve: { role: "system", content: BASE_ROLE + "根据输入的文稿进行文本润色，要求文本正式，内容精简严肃，抓住用户痛点吸引用户观看，只返回处理后的文稿。" },
      shorter: { role: "system", content: BASE_ROLE + "根据输入的文稿进行高质量文本摘要，只返回处理后内容。" },
      longer: { role: "system", content: BASE_ROLE + "根据输入的文稿进行文本续写，要求文本正式，内容精简严肃，只返回续写的内容。" },
      fix: { role: "system", content: BASE_ROLE + "润色文案,修复语法和拼写错误，返回需要修改语法和拼写的点，无需返回完整文本\n" },
      zap: { role: "system", content: BASE_ROLE + "根据输入的文稿和要求进行文本修改在适当的时候使用Markdown格式。" }
    };

    const systemMessage = messageMap[option as keyof typeof messageMap] || messageMap.generate;
    const userContent = option === 'zap' ? `对于这段文本：${prompt}。你必须遵守这些要求：${command}` : 
                       option === 'generate' ? prompt : `现有文本是：${prompt}`;

    // 使用类似OpenAI SDK的方式调用API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: true,
        temperature: 1.2,
        messages: [systemMessage, { role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
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
