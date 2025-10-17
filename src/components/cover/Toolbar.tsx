import React from 'react';
import {
  Monitor,
  Smartphone,
  Eraser,
  Type,
  ImageIcon,
  Grid,
  Layers,
  Trash2,
  Undo2,
  Redo2,
  Download,
  MoreHorizontal
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from '@/hooks/use-toast';
import { Canvas, FabricText} from 'fabric';

interface Template {
  name: string;
  image: string;
  title: string;
  json: string;
  ispc: boolean;
}

interface ToolbarProps {
  isPc: boolean;
  canvas: Canvas | null;
  showGrid: boolean;
  undoHistory: any[];
  redoHistory: any[];
  templates: Template[];
  dialogOpen: boolean;
  onSetSize: (size: 'pc' | 'phone') => void;
  onClearBg: () => void;
  onAddText: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onApplyTemplate: (template: Template) => void;
  onSetDialogOpen: (open: boolean) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isPc,
  canvas,
  showGrid,
  undoHistory,
  redoHistory,
  templates,
  dialogOpen,
  onSetSize,
  onClearBg,
  onAddText,
  onImageUpload,
  onToggleGrid,
  onUndo,
  onRedo,
  onApplyTemplate,
  onSetDialogOpen,
}) => {
  const handleExportPNG = async () => {
    if (canvas) {
      // 移除网格
      canvas.forEachObject(obj => {
        if (obj.type === 'grid') {
          canvas.remove(obj);
        }
      });
      canvas.renderAll();

      // 获取用户信息判断是否为会员
      let isMember = false;
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const userData = await response.json();
        
        // 判断用户是否为会员：有vip_type且vip_end_time未过期
        if (userData.vip_type && userData.vip_end_time) {
          const vipEndTime = new Date(userData.vip_end_time);
          const now = new Date();
          isMember = vipEndTime > now;
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        // 如果获取用户信息失败，默认为非会员
        isMember = false;
      }

      if (!isMember) {
        
        // 添加中心水印
        const centerWatermark = new FabricText('videoflow.ideaswork.cn', {
          left: canvas.width! / 2,
          top: canvas.height! / 2,
          fontSize: 36,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: 'rgba(0, 0, 0, 0.3)',
          stroke: 'rgba(255, 255, 255, 0.5)',
          strokeWidth: 2,
          angle: -30,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false
        });
        
        // 添加右下角水印
        const cornerWatermark = new FabricText('videoflow.ideaswork.cn', {
          left: canvas.width! - 20,
          top: canvas.height! - 20,
          fontSize: 18,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: 'rgba(0, 0, 0, 0.6)',
          stroke: 'rgba(255, 255, 255, 0.8)',
          strokeWidth: 1,
          originX: 'right',
          originY: 'bottom',
          selectable: false,
          evented: false
        });
        
        // 添加水印到canvas
        canvas.add(centerWatermark);
        canvas.add(cornerWatermark);
        canvas.renderAll();
        
        // 导出带水印的图片
        const dataURL = canvas.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 2
        });
        
        // 移除水印
        canvas.remove(centerWatermark);
        canvas.remove(cornerWatermark);
        canvas.renderAll();
        
        // 下载图片
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'cover.png';
        link.click();
      } else {
        // 如果是会员，直接导出无水印图片
        const dataURL = canvas.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: 2
        });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'cover.png';
        link.click();
      }
    }
  };

  const handleBringToFront = () => {
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        canvas.bringObjectToFront(activeObject);
        canvas.renderAll();
      }
    }
  };

  const handleDeleteObject = () => {
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        canvas.remove(activeObject);
        canvas.renderAll();
      } else {
        toast({
          title: "请先选择一个对象",
          variant: "destructive",
        });
      }
    }
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast({
          title: "正在导入...",
          variant: "default",
        });

        const reader = new FileReader();
        reader.onload = async (event) => {
          if (canvas && event.target?.result) {
            try {
              const json = JSON.parse(event.target.result as string);
              canvas.clear();
              await canvas.loadFromJSON(json);
              canvas.requestRenderAll();
              toast({
                title: "导入成功",
                variant: "default",
              });
            } catch (error) {
              console.error('导入失败:', error);
              toast({
                title: "导入失败",
                variant: "destructive",
              });
            }
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportJSON = () => {
    if (canvas) {
      const json = JSON.stringify(canvas.toJSON());
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'cover.json';
      link.click();
    }
  };

  return (
    <div className="flex flex-row gap-2 my-2 justify-start">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isPc ? "default" : "secondary"}
            onClick={() => onSetSize('pc')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>切换为电脑端封面比例</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={!isPc ? "default" : "secondary"}
            onClick={() => onSetSize('phone')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>切换为手机端封面比例</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" onClick={onClearBg}>
            <Eraser className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>清除当前背景图片</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-8 mx-2" />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={onAddText}>
            <Type className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>添加文本</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" asChild>
            <Label htmlFor="file-input" className="cursor-pointer">
              <ImageIcon className="h-4 w-4" />
            </Label>
          </Button>
        </TooltipTrigger>
        <TooltipContent>添加图片</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-8 mx-2" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={onToggleGrid}>
            <Grid className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>显示/隐藏网格</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={handleBringToFront}>
            <Layers className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>将选中元素置顶</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={handleDeleteObject}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>删除选中元素</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-8 mx-2" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={onUndo} disabled={undoHistory.length === 0}>
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>撤销操作</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={onRedo} disabled={redoHistory.length === 0}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>重做操作</TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" onClick={handleExportPNG}>
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>导出当前设计为PNG</TooltipContent>
      </Tooltip>

      <Input
        id="file-input"
        type="file"
        accept="image/*,svg/*"
        className="hidden"
        onChange={onImageUpload}
      />

      <Separator orientation="vertical" className="h-8 mx-2" />

      <Dialog open={dialogOpen} onOpenChange={onSetDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default">
            模板
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[90%]">
          <DialogHeader>
            <DialogTitle>视频封面模板列表</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full px-4 md:px-6 mx-auto py-6">
            {templates.map((template) => (
              <div
                key={template.name}
                className="group relative bg-white dark:bg-gray-950 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => onApplyTemplate(template)}
              >
                {template.image && (
                  <div className="relative aspect-[4/3]">
                    <div className="aspect-[4/3] w-full">
                      <img
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-base md:text-lg text-gray-900 dark:text-gray-100">
                    {template.title}
                  </h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      点击应用模板
                    </span>
                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <svg
                        className="w-3 h-3 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">更多</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleImportJSON}>
            导入
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportJSON}>
            导出JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Toolbar;