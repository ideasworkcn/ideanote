import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoreVertical, Plus, Trash, Search, Folder, File } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ApiKeySettings from '../settings/ApiKeySettings';

import { Copy } from '../../types/Model';

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
  // 左侧与文件系统一致：直接使用传入的顺序（fs:listJsonFiles 已按修改时间降序）
  const renderName = (c: Copy) => c.id;

  // 重命名对话框状态
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
    <div className="w-64 bg-gray-50/80 backdrop-blur-sm border-r border-gray-200 p-3 flex flex-col">
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
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center my-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">文案列表</h2>
        <div className="flex items-center gap-1.5">
          <ApiKeySettings />
          <button 
            className="p-1.5 hover:bg-gray-100/80 rounded-lg transition-all duration-150 ease-out"
            onClick={(e) => {
              e.stopPropagation();
              onAddCopy();
            }}
            title="添加新文案"
          >
            <Plus className="h-3.5 w-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ListSkeleton />
        ) : (
          <div>
            {copies.length === 0 && (
              <div className="text-xs text-gray-500 py-3 text-center bg-gray-50/50 rounded-lg">
                当前文件夹下暂无 JSON 文案
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
                <div className='truncate max-w-[160px] text-sm text-gray-800 font-medium'>
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