import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的文件系统 API 给渲染进程（统一入口）
contextBridge.exposeInMainWorld('electronAPI', {
  filesystem: {
    // 列出工作区的 JSON 文件（扁平）
    listJsonFiles: () => ipcRenderer.invoke('fs:listJsonFiles'),
    // 读取 / 写入 JSON 文件
    readJsonFile: (id: string) => ipcRenderer.invoke('fs:readJsonFile', id),
    writeJsonFile: (id: string, content: string) => ipcRenderer.invoke('fs:writeJsonFile', id, content),
    // 主题与文案的辅助方法（仍基于 FS）

    createJsonFile: (copy: any) => ipcRenderer.invoke('fs:createJsonFile', copy),
    renameJsonFile: (oldId: string, newName: string) => ipcRenderer.invoke('fs:renameJsonFile', oldId, newName),
    deleteJsonFile: (id: string) => ipcRenderer.invoke('fs:deleteJsonFile', id),

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

      };
    };
  }
}
