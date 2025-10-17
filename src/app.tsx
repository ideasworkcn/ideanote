import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import SectionEditPage from './notion';
import NotionSidebar from './components/notion/NotionSidebar';
import { Copy } from './types/Model';
import { novelcopy } from './lib/copyContent';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  // 改为维护平铺的 copies 列表
  const [copies, setCopies] = useState<Copy[]>([]);
  // 跟踪工作区名称（替代 topic）
  const [workspaceId, setWorkspaceId] = useState<string>('workspace');

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Copy[]>([]);
  // 选中项改为选中的 copyId
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);
  // 当前选中文件的内容，仅在点击时加载
  const [currentCopy, setCurrentCopy] = useState<Copy | null>(null);
  // 加载防抖令牌：仅接受最后一次选中对应的加载结果，避免竞态覆盖
  const latestLoadIdRef = useRef<string | null>(null);

  // 简易 basename 提取（无 node:path）
  const getBasename = useCallback((p: string) => {
    try {
      const parts = String(p || '').split(/[\\/]+/);
      return parts.filter(Boolean).pop() || 'workspace';
    } catch {
      return 'workspace';
    }
  }, []);

  // 搜索处理：在 copies 中查找
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      const termLower = term.toLowerCase();
      const results = (copies || [])
        .filter(c => String(c.id).toLowerCase().includes(termLower))
        .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' }));
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [copies]);

  // 文案内容读取：统一按文件名读取 JSON 并映射为 Copy（带竞态保护）
  const loadCopyById = useCallback(async (id: string) => {
    try {
      const raw = await window.electronAPI.filesystem.readJsonFile(id);
      let meta: any = {};
      try { meta = JSON.parse(raw || '{}'); } catch { meta = {}; }
      const hasValidContentString = typeof meta.content === 'string' && meta.content.trim().length > 0;
      const contentStr = hasValidContentString ? meta.content : JSON.stringify(novelcopy('', ''));
      const copy: Copy = {
        id,
        content: contentStr,
        status: typeof meta.status !== 'undefined' ? meta.status : 'active',
        createdAt: typeof meta.createdAt !== 'undefined' ? new Date(meta.createdAt) : new Date(),
        richContent: typeof meta.richContent === 'string' ? meta.richContent : '',
        pptContent: typeof meta.pptContent === 'string' ? meta.pptContent : '',
        pxh: 0,
      };
      // 仅当当前加载请求仍是最新选中项时才更新，避免旧请求覆盖新选择
      if (latestLoadIdRef.current === id) {
        setCurrentCopy(copy);
      }
    } catch (e) {
      console.error('读取文件失败:', e);
      const fallback: Copy = {
        id,
        content: JSON.stringify(novelcopy('', '')),
        status: 'active',
        createdAt: new Date(),
        richContent: '',
        pptContent: '',
        pxh: 0,
      };
      if (latestLoadIdRef.current === id) {
        setCurrentCopy(fallback);
      }
    }
  }, []);

  // 文案点击处理：仅更新选中项，实际加载交由 useEffect 根据最新选中触发
  const handleCopyClick = useCallback(async (e: React.MouseEvent, copyId: string) => {
    e.stopPropagation();
    setSelectedCopyId(copyId);
    // 不直接 await 加载，避免竞态；由下方 effect 触发最新一次加载
  }, []);

  // 选中项变更时的加载：每次选择都用 selectedCopyId 直接加载，防止旧请求覆盖
  useEffect(() => {
    if (!selectedCopyId) {
      setCurrentCopy(null);
      return;
    }
    // 选中项变化时立即清空当前内容，避免旧文案在新 id 下保存
    setCurrentCopy(null);
    latestLoadIdRef.current = selectedCopyId;
    (async () => {
      await loadCopyById(selectedCopyId);
    })();
  }, [selectedCopyId, loadCopyById]);

  // 用 listJsonFiles 构造平铺 copies 列表
  const getAllCopiesFromFilesystem = async (): Promise<Copy[]> => {
    try {
      setLoading(true);
      const api = (window as any).electronAPI;
      if (!api || !api.filesystem) {
        console.warn('electronAPI.filesystem unavailable; skipping initial load in browser preview');
        return [] as any;
      }
      const list = await api.filesystem.listJsonFiles();
      const mapped: Copy[] = (list || []).map((f: any) => ({
        id: f.id,
        content: '',
        status: 'active',
        createdAt: new Date(f.createdAt),
        modifiedAt: new Date(f.modifiedAt),
        richContent: '',
        pptContent: '',
        pxh: 0,
      }));
      return mapped;
    } catch (error) {
      console.error('Error getting copies (fs):', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 更新文件系统中的 Copy（可能返回新的 id，当文件被重命名时）
  const updateCopyInFilesystem = async (copy: Partial<Copy> & { id: string }): Promise<{ success: boolean; id?: string }> => {
    try {
      setLoading(true);
      const oldId = copy.id;
      let newId = oldId; // 不再根据标题自动重命名文件

      // 读取现有 meta 以保留 createdAt/status 等字段
      let existingMeta: any = {};
      try {
        const raw = await window.electronAPI.filesystem.readJsonFile(newId);
        existingMeta = JSON.parse(raw || '{}');
      } catch { existingMeta = {}; }

      const meta = {
        content: copy.content ?? existingMeta.content ?? '',
        status: copy.status ?? existingMeta.status ?? 'active',
        createdAt: existingMeta.createdAt ?? new Date().toISOString(),
        richContent: copy.richContent ?? existingMeta.richContent ?? '',
        pptContent: copy.pptContent ?? existingMeta.pptContent ?? '',
      };
      const writeRes = await window.electronAPI.filesystem.writeJsonFile(newId, JSON.stringify(meta));
      if (!writeRes?.success) throw new Error(writeRes?.error || 'write_failed');
      return { success: true, id: newId };
    } catch (error) {
      console.error('Error updating copy (fs):', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 新建文案（当前工作区）
  const onAddCopy = useCallback(async () => {
    const newCopy = await insertCopyToFilesystem({
      name: '文案名',
      content: JSON.stringify(novelcopy('文案名', 'AI-powered autocompletion')),
      status: 'active'
    });
    if (newCopy.success && newCopy.fileName) {
      const updatedCopies = await getAllCopiesFromFilesystem();
      setCopies(updatedCopies);
      setSelectedCopyId(newCopy.fileName);
    }
  }, []);

  // 文件系统创建文案
  const insertCopyToFilesystem = async (copy: Partial<Copy> & { name?: string; content?: string }): Promise<{ success: boolean; fileName: string }> => {
    try {
      setLoading(true);
      const result = await window.electronAPI.filesystem.createJsonFile(copy);
      return result;
    } catch (error) {
      console.error('Error creating JSON file:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载数据 - 从文件列表构造 copies
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const updated = await getAllCopiesFromFilesystem();
        setCopies(updated);
        if (!selectedCopyId && Array.isArray(updated) && updated.length > 0) {
          const firstCopy = updated[0];
          if (firstCopy) {
            setSelectedCopyId(firstCopy.id);
          }
        }
      } catch (error) {
        console.error('Error loading data (fs list):', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 监听主进程菜单事件：保存 / 新建文案 / 打开工作区
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api || !api.ui) return;

    // 保存：分发 Cmd/Ctrl+S 键盘事件，复用编辑器的保存逻辑
    api.ui.onMenuSave(() => {
      try {
        const evt = new KeyboardEvent('keydown', { key: 's', metaKey: true, ctrlKey: true });
        window.dispatchEvent(evt);
      } catch (e) {
        console.warn('menu:save dispatch failed:', e);
      }
    });

    // 新建文案：直接调用 onAddCopy
    api.ui.onMenuNewNote(() => {
      try { onAddCopy(); } catch (e) { console.warn('menu:new-note failed:', e); }
    });
  }, [onAddCopy]);

  const handleCopyAction = async (action: string, copyId: string, payload?: any) => {
    try {
      switch (action) {
        case 'rename-file': {
          const res = await window.electronAPI.filesystem.renameJsonFile(copyId, payload?.newName || copyId);
          if (!res?.success) throw new Error(res?.error || 'rename_failed');
          const updatedCopies = await getAllCopiesFromFilesystem();
          setCopies(updatedCopies);
          // 若当前选中项被重命名，保持同步
          setSelectedCopyId(prev => (prev === copyId ? (res.id || copyId) : prev));
          // 若当前正在编辑该文案，加载新的内容
          if (currentCopy?.id === copyId) {
            latestLoadIdRef.current = res.id || copyId;
            await loadCopyById(res.id || copyId);
          }
          break;
        }
        case 'delete':
        case 'delete-file': {
          const res = await window.electronAPI.filesystem.deleteJsonFile(copyId);
          if (!res?.success) throw new Error('delete_failed');
          const updatedCopies = await getAllCopiesFromFilesystem();
          setCopies(updatedCopies);
          // 若删除的是当前选中项，清空选中与编辑内容
          setSelectedCopyId(prev => (prev === copyId ? null : prev));
          if (currentCopy?.id === copyId) setCurrentCopy(null);
          break;
        }
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('Error handleCopyAction:', error);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-72 border-r border-gray-200 bg-white">
        <NotionSidebar 
          searchDialogOpen={searchDialogOpen}
          setSearchDialogOpen={setSearchDialogOpen}
          searchTerm={searchTerm}
          searchResults={searchResults}
          handleSearch={handleSearch}
          copies={copies}
          loading={loading}
          selectedCopyId={selectedCopyId}
          workspaceId={workspaceId}
          handleCopyClick={handleCopyClick}
          onAddCopy={onAddCopy}
          handleCopyAction={handleCopyAction}
        />
      </div>
      <div className="flex-1 min-w-0 h-screen overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={(e) => e.preventDefault()}>{workspaceId}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{selectedCopyId ?? '未选择'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SectionEditPage 
          copy={
            currentCopy && currentCopy.id === selectedCopyId
              ? currentCopy
              : selectedCopyId
              ? {
                  id: selectedCopyId,
                  content: JSON.stringify(novelcopy('', '')),
                  status: 'active',
                  createdAt: new Date(),
                  richContent: '',
                  pptContent: '',
                  pxh: 0,
                }
              : undefined
          }
          saveCopy={async (updatedCopy) => {
            const targetId = updatedCopy.id || selectedCopyId;
            if (!targetId) return;

            const res = await updateCopyInFilesystem({ ...updatedCopy, id: targetId });
            const newId = res?.id || targetId;

            setCurrentCopy({ ...updatedCopy, id: newId });

            // 每次保存后都刷新列表，以便顺序与文件系统的修改时间一致
            const refreshed = await getAllCopiesFromFilesystem();
            setCopies(refreshed);

            // 保持选中项一致
            setSelectedCopyId(prev => (prev === targetId ? newId : prev));
          }}
        />
        </div>
      </div>
    </div>
  );
};

// Mount React app to DOM
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  }
});

export default App;