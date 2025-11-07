import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoreVertical, Plus, Trash, Search, Folder, File, Minimize2, Maximize2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ApiKeySettings from '../settings/ApiKeySettings';
import ChatQA from '../ChatQA';

import { Copy } from '../../types/Model';
import { Button } from '../ui/button';

interface NotionSidebarProps {
  // 搜索相关
  searchDialogOpen: boolean;
  setSearchDialogOpen: (open: boolean) => void;
  searchTerm: string;
  searchResults: Copy[];
  handleSearch: (term: string) => void;
  
  // 数据状态
  copies: Copy[];
  loading: boolean;
  selectedCopyId: string | null;
  workspaceId: string;
  
  // 事件处理函数
  handleCopyClick: (e: React.MouseEvent, copyId: string) => void;
  onAddCopy: () => void;
  handleCopyAction: (action: string, copyId: string, payload?: any) => void;
}

// 骨架屏组件
const ListSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-1.5">
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3.5 w-3.5 rounded" />
          </div>
        </div>
        <div className="pl-3 space-y-1">
          {[1, 2].map((j) => (
            <div key={j} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/30">
              <Skeleton className="h-3.5 w-16 rounded" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default function NotionSidebar({
  searchDialogOpen,
  setSearchDialogOpen,
  searchTerm,
  searchResults,
  handleSearch,
  copies,
  loading,
  selectedCopyId,
  workspaceId,
  handleCopyClick,
  onAddCopy,
  handleCopyAction,
}: NotionSidebarProps) {
  // 左侧与文件系统一致：搜索结果显示标题或ID
  const renderName = (c: Copy) => c.title || c.id;

  // 重命名对话框状态
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // KB 索引重建状态
  const [reindexing, setReindexing] = useState(false);
  const [reindexInfo, setReindexInfo] = useState<string | null>(null);
  // 向量索引重建状态
  const [vecIndexing, setVecIndexing] = useState(false);
  const [vecIndexInfo, setVecIndexInfo] = useState<string | null>(null);
  // 简易问答（基于向量检索）
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaResults, setQaResults] = useState<Array<{ id: string; score: number; content: string }>>([]);
  const [qaContext, setQaContext] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(false);
  // 模型下载进度（来自主进程事件）
  const [modelProgress, setModelProgress] = useState<{ type?: string; percentAll?: number; downloadedAll?: number; totalAll?: number; file?: string } | null>(null);
  // 聊天对话标题右侧：向量索引按钮状态
  const [chatVecIndexing, setChatVecIndexing] = useState(false);
  const [chatVecIndexInfo, setChatVecIndexInfo] = useState<string | null>(null);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.on || !api?.removeListener) return;
    const handler = (_event: any, payload: any) => {
      setModelProgress(payload || null);
    };
    api.on('kb:modelDownload', handler);
    return () => {
      try { api.removeListener('kb:modelDownload', handler); } catch {}
    };
  }, []);

  const openRename = (copy: Copy) => {
    setRenameTargetId(copy.id);
    setRenameValue(copy.id);
    setRenameOpen(true);
  };

  const submitRename = () => {
    if (!renameTargetId) return;
    const newName = renameValue.trim();
    if (!newName) { setRenameOpen(false); return; }
    handleCopyAction('rename-file', renameTargetId, { newName });
    setRenameOpen(false);
  };

  return (
    <div className="w-full h-full min-h-0 p-3 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex items-center gap-2 w-full cursor-pointer hover:bg-gray-100/60 p-2 rounded-lg transition-all duration-150 ease-out">
              <Search className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-gray-600 text-sm font-medium">搜索文案...</span>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-gray-900">搜索文案</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  className="pl-9 pr-4 py-2 w-full bg-gray-50/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-150"
                  placeholder="输入关键词搜索..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {/* 重建索引按钮（位于搜索框下方） */}
              <div className="flex items-center justify-between">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${reindexing ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  disabled={reindexing}
                  onClick={async () => {
                    try {
                      setReindexing(true);
                      setReindexInfo(null);
                      const api = (window as any).electronAPI;
                      if (api?.kb?.indexAll) {
                        const res = await api.kb.indexAll();
                        if (res?.success) {
                          setReindexInfo(`索引已重建（${res.count ?? 0} 条文档）`);
                        } else {
                          setReindexInfo(`重建失败：${res?.error ?? '未知错误'}`);
                        }
                      } else {
                        setReindexInfo('重建失败：KB 接口不可用');
                      }
                    } catch (err: any) {
                      setReindexInfo(`重建失败：${String(err)}`);
                    } finally {
                      setReindexing(false);
                    }
                  }}
                  title="重建知识库索引"
                >
                  {reindexing ? '正在重建...' : '重建索引'}
                </button>
                <button
                  className={`ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${vecIndexing ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  disabled={vecIndexing}
                  onClick={async () => {
                    try {
                      setVecIndexing(true);
                      setVecIndexInfo(null);
                      const api = (window as any).electronAPI;
                      if (api?.kb?.indexVectors) {
                        const res = await api.kb.indexVectors();
                        if (res?.success) {
                          setVecIndexInfo(`向量索引已重建（${res.count ?? 0} 个片段）`);
                        } else {
                          setVecIndexInfo(`重建失败：${res?.error ?? '未知错误'}`);
                        }
                      } else {
                        setVecIndexInfo('重建失败：向量接口不可用');
                      }
                    } catch (err: any) {
                      setVecIndexInfo(`重建失败：${String(err)}`);
                    } finally {
                      setVecIndexing(false);
                    }
                  }}
                  title="重建向量索引"
                >
                  {vecIndexing ? '向量重建中...' : '重建向量索引'}
                </button>
                {reindexInfo && (
                  <span className="text-xs text-gray-500 ml-2 truncate" title={reindexInfo}>{reindexInfo}</span>
                )}
                {vecIndexInfo && (
                  <span className="text-xs text-gray-500 ml-2 truncate" title={vecIndexInfo}>{vecIndexInfo}</span>
                )}
              </div>
              <div className="max-h-[280px] overflow-y-auto rounded-lg">
                {searchResults.map((copy) => (
                  <div
                    key={copy.id}
                    className="flex flex-col gap-1.5 p-2.5 hover:bg-gray-50/80 cursor-pointer rounded-lg transition-all duration-150 border-b border-gray-100/50 last:border-0"
                    onClick={() => {
                      handleCopyClick({ stopPropagation: () => {} } as React.MouseEvent, copy.id);
                      setSearchDialogOpen(false);
                    }}
                  >
                    <div className="font-medium text-gray-900 text-sm">{renderName(copy)}</div>
                    {copy.previewHtml && (
                      <div className="text-xs text-gray-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: copy.previewHtml }} />
                    )}
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Folder className="h-3 w-3" />
                      {workspaceId}
                    </div>
                  </div>
                ))}
                {searchTerm && searchResults.length === 0 && (
                  <div className="text-center text-gray-500 py-6 bg-gray-50/50 rounded-lg">
                    <Search className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm">未找到相关文案</span>
                  </div>
                )}
              </div>
              {/* 简易知识库问答 */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-sm font-semibold text-gray-900 mb-2">知识库搜索</div>
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1 bg-gray-50/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-150"
                    placeholder="输入问题，基于工作区内容检索..."
                    value={qaQuestion}
                    onChange={(e) => setQaQuestion(e.target.value)}
                  />
                  <button
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${qaLoading ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    disabled={qaLoading || !qaQuestion.trim()}
                    onClick={async () => {
                      try {
                        setQaLoading(true);
                        setQaError(null);
                        setQaResults([]);
                        setQaContext('');
                        const api = (window as any).electronAPI;
                        if (api?.kb?.answer) {
                          const res = await api.kb.answer(qaQuestion.trim(), 3);
                          if (res?.success) {
                            setQaResults(res.results || []);
                            setQaContext(res.context || '');
                          } else {
                            setQaError(res?.error || '未知错误');
                          }
                        } else {
                          setQaError('KB 向量接口不可用');
                        }
                      } catch (err: any) {
                        setQaError(String(err));
                      } finally {
                        setQaLoading(false);
                      }
                    }}
                  >
                    {qaLoading ? '检索中...' : '检索'}
                  </button>
                </div>
                {qaError && (
                  <div className="text-xs text-red-600 mt-2">{qaError}</div>
                )}
                {qaResults.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-gray-500">命中片段（Top 3）：</div>
                    {qaResults.map((r, i) => (
                      <div key={`${r.id}-${i}`} className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">{r.id} · 相似度 {r.score.toFixed(3)}</div>
                        <div className="text-sm text-gray-800 prose prose-sm max-w-none line-clamp-6">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              code: (props) => {
                                const { children, className } = props as unknown as {
                                  children?: React.ReactNode;
                                  className?: string;
                                  inline?: boolean;
                                };
                                const inline = (props as any).inline as boolean | undefined;
                                const codeText = String(children || '');
                                const match = /language-(\w+)/.exec(className || '');
                                if (inline) {
                                  return <code className={className}>{children}</code>;
                                }
                                const lang = match?.[1];
                                let html = '';
                                try {
                                  if (lang && hljs.getLanguage(lang)) {
                                    html = hljs.highlight(codeText, { language: lang }).value;
                                  } else {
                                    html = hljs.highlightAuto(codeText).value;
                                  }
                                } catch {
                                  html = codeText;
                                }
                                return (
                                  <pre className="hljs">
                                    <code dangerouslySetInnerHTML={{ __html: html }} />
                                  </pre>
                                );
                              }
                            }}
                          >
                            {r.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                    {qaContext && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">合并上下文：</div>
                        <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2 prose prose-sm max-w-none max-h-40 overflow-y-auto">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              code: (props) => {
                                const { children, className } = props as unknown as {
                                  children?: React.ReactNode;
                                  className?: string;
                                  inline?: boolean;
                                };
                                const inline = (props as any).inline as boolean | undefined;
                                const codeText = String(children || '');
                                const match = /language-(\w+)/.exec(className || '');
                                if (inline) {
                                  return <code className={className}>{children}</code>;
                                }
                                const lang = match?.[1];
                                let html = '';
                                try {
                                  if (lang && hljs.getLanguage(lang)) {
                                    html = hljs.highlight(codeText, { language: lang }).value;
                                  } else {
                                    html = hljs.highlightAuto(codeText).value;
                                  }
                                } catch {
                                  html = codeText;
                                }
                                return (
                                  <pre className="hljs">
                                    <code dangerouslySetInnerHTML={{ __html: html }} />
                                  </pre>
                                );
                              }
                            }}
                          >
                            {qaContext}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
       
      </div>
       {/* 新的问答对话入口 */}
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogTrigger asChild>
            <Button  variant="outline">
              开启问答对话
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[680px] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-semibold text-gray-900">知识库问答（对话模式）</DialogTitle>
                <div className="flex items-center gap-3">
                  {modelProgress && modelProgress.type !== 'done' && typeof modelProgress.percentAll === 'number' && (
                    <div className="flex items-center gap-2" title={`模型下载进度 ${modelProgress.percentAll}%`}>
                      <span className="text-xs text-gray-600">模型下载 {modelProgress.percentAll}%</span>
                      <div className="w-24 h-1.5 bg-gray-200 rounded">
                        <div className="h-1.5 bg-blue-600 rounded" style={{ width: `${Math.max(0, Math.min(100, modelProgress.percentAll || 0))}%` }} />
                      </div>
                    </div>
                  )}
                  <button
                    className={`px-2 py-1 rounded-lg text-xs ${chatVecIndexing ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'}`}
                    disabled={chatVecIndexing}
                    onClick={async () => {
                      const api = (window as any).electronAPI;
                      if (!api?.kb?.indexVectors) return;
                      try {
                        setChatVecIndexing(true);
                        setChatVecIndexInfo('向量索引重建中...');
                        const res = await api.kb.indexVectors();
                        if (res?.success) {
                          setChatVecIndexInfo('向量索引已更新');
                        } else {
                          setChatVecIndexInfo(res?.error || '重建失败');
                        }
                      } catch (e) {
                        setChatVecIndexInfo('重建失败');
                      } finally {
                        setTimeout(() => setChatVecIndexing(false), 300);
                      }
                    }}
                    title="重建向量索引"
                  >
                    重建向量索引
                  </button>
                </div>
              </div>
            </DialogHeader>
            <ChatQA />
          </DialogContent>
        </Dialog>

      <div className="flex justify-between items-center my-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide pl-2">笔记列表</h2>
        <div className="flex items-center gap-1">
          
          <ApiKeySettings />
          <button 
            className="p-1.5 hover:bg-gray-100/80 rounded-lg transition-all duration-150 ease-out"
            onClick={(e) => {
              e.stopPropagation();
              onAddCopy();
            }}
            title="添加笔记"
          >
            <Plus className="h-3.5 w-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overscroll-contain overflow-y-auto scroll-smooth scrollbar-none">
        {loading ? (
          <ListSkeleton />
        ) : (
          <div>
            {copies.length === 0 && (
              <div className="text-xs text-gray-500 py-3 text-center bg-gray-50/50 rounded-lg">
                当前文件夹下暂无笔记
              </div>
            )}
            {copies.map((copy) => (
              <div
                key={copy.id}
                className={`p-2 hover:bg-gray-100/70 rounded-lg cursor-pointer flex items-center justify-between group transition-all duration-150 ease-out ${
                  selectedCopyId && selectedCopyId === copy.id ? 'bg-blue-50/50 border border-blue-200/50' : 'border border-transparent'
                }`}
                onClick={(e) => handleCopyClick(e, copy.id)}
              >
                <div className='truncate max-w-[240px] text-sm text-gray-800 font-medium'>
                  {renderName(copy)}
                </div>
                <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-150'>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 hover:bg-gray-200/60 rounded-md transition-colors">
                      <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg shadow-lg">
                      <DropdownMenuItem 
                        onClick={() => openRename(copy)}
                        className="text-sm py-1.5 px-3 hover:bg-gray-50/80 transition-colors"
                      >
                        <File className="mr-2 h-3.5 w-3.5 text-gray-600" />
                        <span>重命名</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCopyAction('delete', copy.id)}
                        className="text-sm py-1.5 px-3 hover:bg-red-50/50 text-red-600 transition-colors"
                      >
                        <Trash className="mr-2 h-3.5 w-3.5" />
                        <span>删除</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 重命名文件名对话框 */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[380px] bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">重命名文件名</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <Input
              placeholder="输入新的文件名..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className="bg-gray-50/50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-150"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button 
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors duration-150"
                onClick={() => setRenameOpen(false)}
              >
                取消
              </button>
              <button 
                className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors duration-150"
                onClick={submitRename}
              >
                保存
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}