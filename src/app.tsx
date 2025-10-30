import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import SectionEditPage from './notion';
import NotionSidebar from './components/notion/NotionSidebar';
import WelcomePage from './components/WelcomePage';
import { Copy } from './types/Model';
import { novelcopy } from './lib/copyContent';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AboutDialog } from '@/components/AboutDialog';
import { Button } from '@/components/ui/button';
import { Minimize2, PanelLeft, PanelLeftClose } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  // 改为维护平铺的 copies 列表
  const [copies, setCopies] = useState<Copy[]>([]);
  // 跟踪工作区名称（替代 topic）
  const [workspaceId, setWorkspaceId] = useState<string>('workspace');
  // 欢迎页面状态
  const [showWelcome, setShowWelcome] = useState(true);
  const [workspacePath, setWorkspacePath] = useState<string>('');

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Copy[]>([]);
  // 选中项改为选中的 copyId
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);
  // 当前选中文件的内容，仅在点击时加载
  const [currentCopy, setCurrentCopy] = useState<Copy | null>(null);
  // 加载防抖令牌：仅接受最后一次选中对应的加载结果，避免竞态覆盖
  const latestLoadIdRef = useRef<string | null>(null);
  // 关于对话框状态
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  // 专注模式状态
  const [focusMode, setFocusMode] = useState(false);

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
      console.log(`[开始读取文件] ID: ${id}`);
      const raw = await window.electronAPI.filesystem.readJsonFile(id);
      console.log(`[文件读取完成] ID: ${id}, 原始内容长度: ${raw?.length || 0}`);
      
      let meta: any = {};
      try { 
        meta = JSON.parse(raw || '{}'); 
        console.log(`[JSON解析成功] ID: ${id}, meta内容:`, meta);
      } catch (e) { 
        console.warn(`[JSON解析失败] ID: ${id}, 错误:`, e);
        meta = {}; 
      }
      
      const hasValidContentString = typeof meta.content === 'string' && meta.content.trim().length > 0;
      const contentStr = hasValidContentString ? meta.content : JSON.stringify(novelcopy('', ''));
      
      console.log(`[构建Copy对象] ID: ${id}, 使用内容长度: ${contentStr.length}`);
      
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
        console.log(`[设置当前文案] ID: ${id}`);
        setCurrentCopy(copy);
      } else {
        console.log(`[忽略过期请求] 当前ID: ${latestLoadIdRef.current}, 请求ID: ${id}`);
      }
    } catch (e) {
      console.error(`[读取文件失败] ID: ${id}:`, e);
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
    
    console.log(`[文案切换开始] 选中ID: ${selectedCopyId}`);
    
    // 选中项变化时立即清空当前内容，避免旧文案在新 id 下保存
    setCurrentCopy(null);
    latestLoadIdRef.current = selectedCopyId;
    
    // 异步加载新文案
    (async () => {
      await loadCopyById(selectedCopyId);
      console.log(`[文案切换完成] ID: ${selectedCopyId}`);
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
    
    // 只有在不显示欢迎页面时才加载数据
    if (!showWelcome) {
      loadData();
    }
  }, [showWelcome]);

  // 监听工作区打开事件
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api || !api.ui) return;

    // 监听工作区打开事件
    api.ui.onWorkspaceOpened(async (workspacePath: string) => {
      setWorkspacePath(workspacePath);
      setWorkspaceId(getBasename(workspacePath));
      
      // 重新加载新工作区的数据
      try {
        setLoading(true);
        const updated = await getAllCopiesFromFilesystem();
        setCopies(updated);
        // 重置选中的文案
        setSelectedCopyId(null);
        setCurrentCopy(null);
        // 如果有文案，选中第一个
        if (Array.isArray(updated) && updated.length > 0) {
          const firstCopy = updated[0];
          if (firstCopy) {
            setSelectedCopyId(firstCopy.id);
          }
        }
        // 只有在成功加载数据后才隐藏欢迎页面
        setShowWelcome(false);
      } catch (error) {
        console.error('Error loading data after workspace change:', error);
      } finally {
        setLoading(false);
      }
    });
  }, [getBasename, getAllCopiesFromFilesystem]);

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

    // 监听关于页面菜单事件
    const handleShowAbout = () => {
      setAboutDialogOpen(true);
    };
    
    // 添加菜单事件监听器
    api.on('menu:show-about', handleShowAbout);
    
    // 清理函数
    return () => {
      api.removeListener('menu:show-about', handleShowAbout);
    };
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

  // 欢迎页面处理函数
  const handleSelectWorkspace = useCallback(async () => {
    try {
      const api = (window as any).electronAPI;
      if (api && api.filesystem && api.filesystem.selectWorkspace) {
        await api.filesystem.selectWorkspace();
      }
    } catch (error) {
      console.error('Error selecting workspace:', error);
    }
  }, []);

  // 使用默认工作区处理函数
  const handleUseDefault = useCallback(async () => {
    try {
      // 先设置工作区路径
      setWorkspacePath('默认工作区');
      setWorkspaceId('workspace');
      
      // 加载默认工作区的数据
      setLoading(true);
      const updated = await getAllCopiesFromFilesystem();
      setCopies(updated);
      
      // 重置选中的文案
      setSelectedCopyId(null);
      setCurrentCopy(null);
      
      // 如果有文案，选中第一个
      if (Array.isArray(updated) && updated.length > 0) {
        const firstCopy = updated[0];
        if (firstCopy) {
          setSelectedCopyId(firstCopy.id);
        }
      }
      
      // 只有在成功加载数据后才隐藏欢迎页面
      setShowWelcome(false);
    } catch (error) {
      console.error('Error loading default workspace:', error);
    } finally {
      setLoading(false);
    }
  }, [getAllCopiesFromFilesystem]);

  // 打开文件夹位置
  const handleOpenWorkspaceFolder = useCallback(async () => {
    try {
      const api = (window as any).electronAPI;
      if (api && api.filesystem && api.filesystem.openFolder) {
        await api.filesystem.openFolder(workspacePath);
      }
    } catch (error) {
      console.error('Error opening workspace folder:', error);
    }
  }, [workspacePath]);

  // 切换专注模式
  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => !prev);
  }, []);

  // 检测屏幕尺寸并自动调整sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // 移动端默认折叠
        setFocusMode(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 监听快捷键切换专注模式 (Cmd/Ctrl + Shift + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggleFocusMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleFocusMode]);

  return (
    <div className="flex min-h-screen">
      {showWelcome ? (
        <div className="flex w-full">
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
          <div className="flex-1 min-w-0 h-screen overflow-hidden flex flex-col bg-gray-50">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">选择工作区</h2>
                <p className="text-gray-600 mb-6">请选择或创建一个工作区文件夹来开始创作</p>
                <div className="space-y-3 max-w-sm mx-auto">
                  <Button 
                    onClick={handleSelectWorkspace}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h-6"></path>
                    </svg>
                    选择工作区文件夹
                  </Button>
                  
                  {workspacePath && (
                    <Button 
                      onClick={handleUseDefault}
                      variant="outline"
                      className="w-full border-gray-300 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      使用默认工作区
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* 底部文件夹位置显示 */}
            {workspacePath && (
              <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                  </svg>
                  <span>当前位置:</span>
                  <span className="ml-1 font-medium text-gray-700">{workspacePath}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleOpenWorkspaceFolder}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  打开文件夹
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 左侧边栏 - 响应式折叠设计 */}
          <div className={`${focusMode ? 'w-0 md:w-16' : 'w-72'} transition-all duration-300 ease-in-out border-r border-gray-200 bg-white relative overflow-hidden`}>
            {/* 折叠/展开按钮 - 带动画效果 */}
            <button
              onClick={toggleFocusMode}
              className={`absolute top-4 z-10 p-2 bg-white border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-300 hover:scale-110 ${
                focusMode ? 'right-2 rotate-180' : 'right-2'
              }`}
              title={focusMode ? "展开侧边栏" : "收起侧边栏"}
            >
              <div className="relative w-4 h-4">
                <PanelLeftClose className={`absolute inset-0 w-4 h-4 text-gray-600 transition-all duration-300 ${
                  focusMode ? 'opacity-0 rotate-180 scale-75' : 'opacity-100 rotate-0 scale-100'
                }`} />
                <PanelLeft className={`absolute inset-0 w-4 h-4 text-gray-600 transition-all duration-300 ${
                  focusMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-75'
                }`} />
              </div>
            </button>
            
            <div className={`${focusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300 h-full`}>
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
          </div>



          {/* 主内容区域 - 响应sidebar折叠状态 */}
          <div className={`${focusMode ? 'flex-1' : 'flex-1 min-w-0'} h-screen overflow-hidden flex flex-col transition-all duration-300 ease-in-out`}>
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
        
        {/* 底部文件夹位置显示 - 专注模式下隐藏 */}
        {!focusMode && (
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
              </svg>
              <span>当前位置:</span>
              <span className="ml-1 font-medium text-gray-700">{workspacePath || workspaceId}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleOpenWorkspaceFolder}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
              打开文件夹
            </Button>
          </div>
        )}
      </div>
        </>
      )}
      
      {/* 关于对话框 */}
      <AboutDialog 
        open={aboutDialogOpen} 
        onOpenChange={setAboutDialogOpen} 
      />
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