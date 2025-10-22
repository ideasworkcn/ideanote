import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的文件系统 API 给渲染进程（统一入口）
contextBridge.exposeInMainWorld('electronAPI', {
  filesystem: {
    // 基础文件系统操作
    listJsonFiles: () => ipcRenderer.invoke('fs:listJsonFiles'),
    readJsonFile: (id: string) => ipcRenderer.invoke('fs:readJsonFile', id),
    writeJsonFile: (id: string, content: string) => ipcRenderer.invoke('fs:writeJsonFile', id, content),
    // 主题与文案的辅助方法（仍基于 FS）

    createJsonFile: (copy: any) => ipcRenderer.invoke('fs:createJsonFile', copy),
    renameJsonFile: (oldId: string, newName: string) => ipcRenderer.invoke('fs:renameJsonFile', oldId, newName),
    deleteJsonFile: (id: string) => ipcRenderer.invoke('fs:deleteJsonFile', id),
    
    // 工作区选择
    selectWorkspace: () => ipcRenderer.invoke('fs:selectWorkspace'),
    
    // 图片保存功能
    saveImage: (imageBuffer: Uint8Array, fileName: string) => ipcRenderer.invoke('fs:saveImage', imageBuffer, fileName),
    
    // 通用媒体文件保存功能（支持视频、音频、图片）
    saveMedia: (mediaBuffer: Uint8Array, fileName: string, mediaType: 'video' | 'audio' | 'image') => ipcRenderer.invoke('fs:saveMedia', mediaBuffer, fileName, mediaType),
  },
  // AI 生成功能
  ai: {
    generate: (prompt: string, option: string, command?: string) => ipcRenderer.invoke('ai:generate', prompt, option, command),
    generateStream: (prompt: string, option: string, command?: string) => ipcRenderer.invoke('ai:generateStream', prompt, option, command),
  },
  // 设置管理功能
  settings: {
    getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
    setApiKey: (apiKey: string) => ipcRenderer.invoke('settings:setApiKey', apiKey),
  },
  // UI / 菜单事件
  ui: {
    onMenuSave: (callback: () => void) => {
      ipcRenderer.on('menu:save', () => callback());
    },
    onMenuNewNote: (callback: () => void) => {
      ipcRenderer.on('menu:new-note', () => callback());
    },
    onMenuNewTopic: (callback: () => void) => {
      ipcRenderer.on('menu:new-topic', () => callback());
    },
    onWorkspaceOpened: (callback: (workspacePath: string) => void) => {
      ipcRenderer.on('workspace:opened', (_, workspacePath: string) => callback(workspacePath));
    },
  },
  // IPC 事件监听器
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

// 调试：确认预加载是否运行以及是否成功暴露 API
try {
  // @ts-ignore
  console.log('[preload] contextBridge exposed:', typeof window.electronAPI);
} catch (e) {
  console.log('[preload] window access error:', e);
}

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      ui: {
        onMenuSave: (callback: () => void) => void;
        onMenuNewNote: (callback: () => void) => void;
        onMenuNewTopic: (callback: () => void) => void;
        onWorkspaceOpened: (callback: (workspacePath: string) => void) => void;
      };
      filesystem: {
        listJsonFiles: () => Promise<Array<{ id: string; fileName: string; createdAt: string; modifiedAt: string; size: number }>>;
        readJsonFile: (id: string) => Promise<string>;
        writeJsonFile: (id: string, content: string) => Promise<{ success: boolean; error?: string }>;

        createJsonFile: (copy: any) => Promise<{ success: boolean; fileName: string }>;
        renameJsonFile: (oldId: string, newName: string) => Promise<{ success: boolean; id?: string; error?: string }>;
        deleteJsonFile: (id: string) => Promise<{ success: boolean }>;
        
        // 图片保存功能类型声明
        saveImage: (imageBuffer: Uint8Array, fileName: string) => Promise<{ success: boolean; fileName?: string; relativePath?: string; fullPath?: string; error?: string }>;
        
        // 通用媒体文件保存功能类型声明
        saveMedia: (mediaBuffer: Uint8Array, fileName: string, mediaType: 'video' | 'audio' | 'image') => Promise<{ success: boolean; fileName?: string; relativePath?: string; fullPath?: string; error?: string }>;
      };
      ai: {
        generate: (prompt: string, option: string, command?: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        generateStream: (prompt: string, option: string, command?: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      };
      settings: {
        getApiKey: () => Promise<{ success: boolean; apiKey?: string; error?: string }>;
        setApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
      };
      // IPC 事件监听器
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}
