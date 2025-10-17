"use client";
import { defaultEditorContent } from "@/lib/content";
import { novelcopy } from "@/lib/copyContent";
import { Button } from "@/components/ui/button"
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  type JSONContent,
} from "novel";
import { ImageResizer, handleCommandNavigation } from "novel/extensions";
import { MermaidExtension } from '@/components/tailwind/MermaidExtension'
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { NodeSelector } from "./selectors/node-selector";
import { MathSelector } from "./selectors/math-selector";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { handleImageDrop, handleImagePaste } from "novel/plugins";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { uploadFn } from "./image-upload";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";
import { Copy } from "@/types/Model";
import { AudioSelector } from "./selectors/audio-selector";
import { Save, FileText, Presentation, Share2, Sparkles,Download } from "lucide-react";

import hljs from 'highlight.js';

// Function to clean content structure and prevent empty text nodes
const cleanContentStructure = (content: any): any => {
  if (!content || typeof content !== 'object') {
    return content;
  }

  if (Array.isArray(content)) {
    // 保持数组结构，但清理每个元素
    return content.map(cleanContentStructure).filter((item: any) => item !== null);
  }

  // 对于文本节点，移除空文本节点以避免ProseMirror错误
  if (content.type === 'text') {
    // 如果文本为空或只包含空白字符，返回null以便过滤掉
    if (!content.text || content.text.trim() === '') {
      return null;
    }
    return content;
  }

  // 对于其他节点类型，递归清理内容
  if (content.content && Array.isArray(content.content)) {
    const cleanedContent = content.content.map(cleanContentStructure).filter((item: any) => item !== null);
    
    // 如果清理后内容为空，但节点类型需要内容，则提供默认内容
    if (cleanedContent.length === 0) {
      if (content.type === 'heading' || content.type === 'paragraph') {
        // 对于标题和段落，如果没有内容则移除整个节点
        return null;
      }
    }
    
    return {
      ...content,
      content: cleanedContent
    };
  }

  // 对于没有content属性的节点（如空段落），需要特殊处理
  if (content.type === 'paragraph' && !content.content) {
    // 空段落节点，移除它
    return null;
  }

  return content;
};

// Remove duplicate markdownExtension since it's already in defaultExtensions
const extensions = [...defaultExtensions, slashCommand, MermaidExtension]

interface TailwindAdvancedEditorProps {
  copy?: Copy;
  saveCopy?: (copy: Copy) => Promise<void>;
  // 新增按钮显示控制变量
  showExportMD?: boolean;
  showScriptMaking?: boolean;
  showPPTMaking?: boolean;
  showSave?: boolean;
  showShare?: boolean;
}
declare global {
  interface Window {
    editorInstance: EditorInstance;
  }
}

const TailwindAdvancedEditor = ({ 
  copy, 
  saveCopy,
  showExportMD = true,
  showScriptMaking = true,
  showPPTMaking = true,
  showSave = true,
  showShare = true
}: TailwindAdvancedEditorProps) => {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("unSaved");
  const [charsCount, setCharsCount] = useState<number>(0);
  const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null); // 新增状态

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const [openAudio,setOpenAudio] = useState(false);

  //Apply Codeblock Highlighting on the HTML from editor.getHTML()
  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('pre code').forEach((el) => {
      // @ts-ignore
      // https://highlightjs.readthedocs.io/en/latest/api.html?highlight=highlightElement#highlightelement
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    const textContent = editor.getText(); // 获取纯文本内容
    const chineseCharCount = (textContent.match(/[\u4e00-\u9fa5]/g) || []).length; // 统计中文字符
    const wordCount = textContent.split(/\s+/).filter(Boolean).length; // 统计英文单词
    const totalCount = chineseCharCount + wordCount; // 综合统计
    
    setCharsCount(totalCount);
    
    // 使用单一缓存键存储所有编辑器数据
    const id = copy?.id || 'no-copy';
    const editorCache = {
      json: json,
      html: highlightCodeblocks(editor.getHTML()),
      markdown: editor.storage.markdown.getMarkdown(),
      timestamp: Date.now()
    };
    
    localStorage.setItem(`editor-cache-${id}`, JSON.stringify(editorCache));
    setSaveStatus("unSaved");
  }, 500);

  useEffect(() => {
    // 每次切换文案都重置编辑器，设置当前文案的初始缓存，避免内容不更新
    if (editorInstance) {
      editorInstance.destroy();
      setEditorInstance(null);
    }
  
    const id = copy?.id || 'no-copy';
    const raw = typeof copy?.content === 'string' ? copy.content.trim() : '';
    let parsed: JSONContent | null = null;
    
    // 详细的JSON解析过程，包含错误日志
    if (raw) {
      console.log(`[JSON解析] 文件ID: ${id}, 原始内容长度: ${raw.length}`);
      console.log(`[JSON解析] 原始内容预览: ${raw.substring(0, 200)}${raw.length > 200 ? '...' : ''}`);
      
      if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
          console.log(`[JSON解析] 开始解析JSON内容...`);
          parsed = JSON.parse(raw);
          console.log(`[JSON解析] ✅ JSON解析成功`, parsed);
          
          // Validate and clean the parsed content to prevent empty text nodes
          if (parsed && typeof parsed === 'object') {
            const originalParsed = JSON.stringify(parsed);
            parsed = cleanContentStructure(parsed);
            console.log(`[JSON解析] ✅ 内容结构清理完成`, parsed);
            
            if (JSON.stringify(parsed) !== originalParsed) {
              console.log(`[JSON解析] ℹ️ 内容结构已优化，移除了空文本节点`);
            }
          }
        } catch (error) {
          console.error(`[JSON解析] ❌ JSON解析失败 - 文件ID: ${id}`);
          console.error(`[JSON解析] 错误详情:`, error);
          console.error(`[JSON解析] 问题内容:`, raw);
          
          // 尝试分析具体的解析问题
          if (error instanceof SyntaxError) {
            console.error(`[JSON解析] 语法错误: ${error.message}`);
            
            // 检查常见的JSON格式问题
            if (raw.includes('undefined')) {
              console.error(`[JSON解析] 发现undefined值，这不是有效的JSON`);
            }
            if (raw.includes("'")) {
              console.error(`[JSON解析] 发现单引号，JSON应使用双引号`);
            }
            if (!raw.endsWith('}') && !raw.endsWith(']')) {
              console.error(`[JSON解析] JSON内容可能不完整，缺少结束符号`);
            }
          }
          
          parsed = null;
        }
      } else {
        console.warn(`[JSON解析] ⚠️ 内容不是JSON格式 - 文件ID: ${id}`);
        console.warn(`[JSON解析] 内容开头: "${raw.substring(0, 50)}"`);
        parsed = null;
      }
    } else {
      console.log(`[JSON解析] ℹ️ 内容为空 - 文件ID: ${id}`);
    }
    
    // 如果解析失败，使用空的默认内容而不是文件名作为标题
    const nextInitial = parsed ?? novelcopy('', '');
    
    if (!parsed) {
      console.log(`[JSON解析] 🔄 使用默认内容结构替代`);
    } else {
      console.log(`[JSON解析] 🎯 准备设置解析后的内容:`, nextInitial);
    }
    
    // 强制清空初始内容，确保重新渲染
    console.log(`[状态更新] 清空initialContent，准备重新设置`);
    setInitialContent(null);
    
    // 使用 setTimeout 确保状态更新后再设置新内容
    setTimeout(() => {
      console.log(`[状态更新] 设置新的initialContent:`, nextInitial);
      setInitialContent(nextInitial);
    }, 10); // 增加延迟时间，确保状态更新

    // 清理所有可能存在的旧缓存，避免内容混乱
    try {
      // 清理所有可能的旧缓存键（包括旧的多键缓存和新的单键缓存）
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('html-content-') || 
          key.startsWith('novel-content-') || 
          key.startsWith('markdown-') ||
          key.startsWith('editor-cache-')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 预写入当前文案的单一缓存，保证在 onUpdate 触发前保存也能拿到正确内容
      const initialCache = {
        json: nextInitial,
        html: '',
        markdown: copy?.richContent || '',
        timestamp: Date.now()
      };
      localStorage.setItem(`editor-cache-${id}`, JSON.stringify(initialCache));
    } catch (e) {
      console.warn('初始化缓存失败:', e);
    }
  }, [copy]); 

  const saveNovelCopy = async (editor?: EditorInstance) => {
    try {
      if (!copy || !saveCopy) return;
      
      setSaveStatus('保存中...');
      const id = copy.id || 'no-copy';
      
      let content, markdownContent;
      
      if (editor) {
        // 直接从编辑器获取最新内容
        content = editor.getJSON();
        markdownContent = editor.storage.markdown.getMarkdown();
      } else {
        // 从单一缓存中获取内容
        try {
          const cacheData = localStorage.getItem(`editor-cache-${id}`);
          if (cacheData) {
            const cache = JSON.parse(cacheData);
            content = cache.json;
            markdownContent = cache.markdown;
          } else {
            content = null;
            markdownContent = '';
          }
        } catch (e) {
          console.warn('读取缓存失败:', e);
          content = null;
          markdownContent = '';
        }
      }

      const updatedCopy: Copy = {
        ...copy,
        content: JSON.stringify(content) || '', // 始终写入字符串
        richContent: markdownContent || '',
      };

      await saveCopy(updatedCopy);
      setSaveStatus('已保存');
    } catch (error) {
      console.error('保存失败:', error);
      setSaveStatus('保存失败');
    }
  };

  const handleExport = () => {
    if (!copy?.richContent) return;
    
    try {
      const blob = new Blob([new TextEncoder().encode(copy.richContent)], { 
        type: 'text/markdown;charset=utf-8' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${copy.id || 'untitled'}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否是 Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();  // 阻止浏览器默认保存行为
        if (editorInstance) {
          saveNovelCopy(editorInstance);     // 调用保存函数
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNovelCopy]);  // 依赖 saveNovelCopy 以确保最新引用

  const getSaveStatusVariant = () => {
    switch (saveStatus) {
      case '已保存':
        return 'default';
      case '保存中...':
        return 'secondary';
      case '保存失败':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case '已保存':
        return 'text-green-600 dark:text-green-400';
      case '保存中...':
        return 'text-blue-600 dark:text-blue-400';
      case '保存失败':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-orange-600 dark:text-orange-400';
    }
  };

  if (!initialContent) return null;

  return (
    <div className="relative w-full max-w-screen-2xl">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 dark:bg-blue-800/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-800/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* 状态指示器 */}
      <div className="flex absolute left-5 top-5 z-10 mb-5 gap-3">
        <Badge 
          variant={getSaveStatusVariant()}
          className={cn(
            "px-3 py-1.5 text-sm font-medium backdrop-blur-sm border-0",
            "bg-white/80 dark:bg-gray-900/80 shadow-lg",
            getSaveStatusColor()
          )}
        >
          {saveStatus}
        </Badge>
        {charsCount > 0 && (
          <Badge 
            variant="outline"
            className="px-3 py-1.5 text-sm backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 shadow-lg"
          >
            {charsCount} Words
          </Badge>
        )}
      </div>
      
      {/* 操作按钮组 */}
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        {showExportMD && (
          <Button 
            variant="outline" 
            size="sm"
            className={cn(
              "px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200",
              "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50",
              "border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300",
              "hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/70 dark:hover:to-emerald-900/70",
              "hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg hover:shadow-green-200/25 dark:hover:shadow-green-900/25",
              "hover:scale-105 active:scale-95"
            )}
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-1.5" />
            <span className="font-semibold">导出MD</span>
          </Button>
        )}
        
        {showScriptMaking && (
          <Button 
            variant="outline" 
            size="sm"
            className={cn(
              "px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200",
              "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50",
              "border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-300",
              "hover:from-yellow-100 hover:to-amber-100 dark:hover:from-yellow-900/70 dark:hover:to-amber-900/70",
              "hover:border-yellow-300 dark:hover:border-yellow-700 hover:shadow-lg hover:shadow-yellow-200/25 dark:hover:shadow-yellow-900/25",
              "hover:scale-105 active:scale-95"
            )}
            onClick={() => window.open(`/scripts/${copy?.id}`,'_blank')}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            <span className="font-semibold">脚本制作</span>
          </Button>
        )}
        
        {showPPTMaking && (
          <Button 
            variant="outline" 
            size="sm"
            className={cn(
              "px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200",
              "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50",
              "border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300",
              "hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/70 dark:hover:to-indigo-900/70",
              "hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-200/25 dark:hover:shadow-blue-900/25",
              "hover:scale-105 active:scale-95"
            )}
            onClick={() => window.open(`/pptedit/${copy?.id}`,'_blank')}
          >
            <Presentation className="w-4 h-4 mr-1.5" />
            <span className="font-semibold">PPT制作</span>
          </Button>
        )}
        
        {showSave && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => editorInstance && saveNovelCopy(editorInstance)}
            className={cn(
              "px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200",
              "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
              "text-white border-0 shadow-lg hover:shadow-xl hover:shadow-blue-500/25",
              "hover:scale-105 active:scale-95"
            )}
          >
            <Save className="w-4 h-4 mr-1.5" />
            保存
          </Button>
        )}
        
        {showShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/notion/copy/${copy?.id}`, '_blank')}
            className={cn(
              "px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-200",
              "bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700",
              "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
              "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg",
              "hover:scale-105 active:scale-95"
            )}
          >
            <Share2 className="w-4 h-4 mr-1.5" />
            分享或打印
          </Button>
        )}
      </div>
      
      <EditorRoot key={`${copy?.id || 'no-copy'}-${JSON.stringify(initialContent)?.slice(0, 50) || 'empty'}`}>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions as any}
          className={cn(
            "relative p-24 min-h-[700px] w-full max-w-screen-2xl transition-all duration-300",
            "bg-white dark:bg-gray-900",
            "sm:mb-[calc(20vh)] sm:rounded-2xl sm:border sm:border-gray-200/50 dark:sm:border-gray-700/50",
            "sm:shadow-2xl sm:shadow-gray-900/10 dark:sm:shadow-black/20"
          )}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full prose-blue dark:prose-blue",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setEditorInstance(editor);
            // @ts-ignore
            window.editorInstance = editor;
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className={cn(
          "z-[1111] h-auto max-h-[330px] overflow-y-auto transition-all duration-200",
          "rounded-xl border-2 border-gray-400",
          "bg-white !opacity-100",
          "px-2 py-3 shadow-2xl shadow-gray-900/30"
        )}>
            <EditorCommandEmpty className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)
          }
                  className={cn(
                    "flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-left text-sm",
                    "transition-all duration-150 cursor-pointer",
                    "hover:bg-blue-100 dark:hover:bg-blue-900 aria-selected:bg-blue-200 dark:aria-selected:bg-blue-800",
                    "hover:shadow-sm"
                  )}
                  key={item.title}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                    "group-hover:border-blue-300 dark:group-hover:border-blue-600"
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>
      
          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" className="bg-gradient-to-b from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" className="bg-gradient-to-b from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" className="bg-gradient-to-b from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800" />
            <MathSelector />
            <Separator orientation="vertical" className="bg-gradient-to-b from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800" />
            <TextButtons />
            <Separator orientation="vertical" className="bg-gradient-to-b from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
            <Separator orientation="vertical" className="bg-gradient-to-b from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800" />
            <AudioSelector open={openAudio} onOpenChange={setOpenAudio} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default TailwindAdvancedEditor;
