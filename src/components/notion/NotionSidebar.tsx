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
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
        <div className="pl-4 space-y-2">
          {[1, 2].map((j) => (
            <div key={j} className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
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
    <div className="w-64 bg-gray-100 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex items-center gap-2 w-full cursor-pointer hover:bg-gray-200 p-2 rounded transition-colors duration-200">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="text-gray-500 text-sm font-medium">搜索文案...</span>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">搜索文案</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="输入关键词搜索..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-md">
                {searchResults.map((copy) => (
                  <div
                    key={copy.id}
                    className="flex flex-col gap-1.5 p-3 hover:bg-gray-50 cursor-pointer rounded-md transition-colors duration-200 border-b border-gray-100 last:border-0"
                    onClick={() => {
                      handleCopyClick({ stopPropagation: () => {} } as React.MouseEvent, copy.id);
                      setSearchDialogOpen(false);
                    }}
                  >
                    <div className="font-medium text-gray-900">{renderName(copy)}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Folder className="h-3.5 w-3.5" />
                      {workspaceId}
                    </div>
                  </div>
                ))}
                {searchTerm && searchResults.length === 0 && (
                  <div className="text-center text-gray-500 py-8 bg-gray-100 rounded-md">
                    <Search className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    未找到相关文案
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between my-4">
        <h2 className="text-lg font-semibold">项目文案管理</h2>
        <span 
          className='cursor-pointer'
          onClick={(e) => {
            e.stopPropagation();
            onAddCopy();
          }}
        >
          <Plus className="h-4 w-4" />
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ListSkeleton />
        ) : (
          <div>
            {copies.length === 0 && (
              <div className="text-sm text-gray-400 py-2">
                当前文件夹下暂无 JSON 文案
              </div>
            )}
            {copies.map((copy) => (
              <div
                key={copy.id}
                className={`p-2 hover:bg-gray-200 rounded cursor-pointer flex items-center justify-between group ${
                  selectedCopyId && selectedCopyId === copy.id ? 'bg-gray-200' : ''
                }`}
                onClick={(e) => handleCopyClick(e, copy.id)}
              >
                <div className='truncate max-w-[180px]'>
                  {renderName(copy)}
                </div>
                <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => openRename(copy)}>
                        <File className="mr-2 h-4 w-4" />
                        <span>重命名</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyAction('delete', copy.id)}>
                        <Trash className="mr-2 h-4 w-4" />
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
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">重命名文件名</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="输入新的文件名..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded bg-gray-200" onClick={() => setRenameOpen(false)}>取消</button>
              <button className="px-3 py-1 rounded bg-rose-500 text-white" onClick={submitRename}>保存</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}