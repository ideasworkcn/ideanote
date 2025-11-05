import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Users,
  BookOpen,
  List,
  ListOrdered,
  Text,
  TextQuote,
  Sparkles,
  ChartArea,
  VideoIcon,
  Youtube,
  Twitter,
  TableIcon
} from "lucide-react";
import mermaid from 'mermaid'
import { createSuggestionItems , Command, renderItems } from "novel/extensions";
import { uploadFn } from "./image-upload";
import { mediaUploadFn } from "./media-upload";
import {  Range } from '@tiptap/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { createRoot } from 'react-dom/client';
// 新增输入对话框函数
const createInputModal = (title: string, placeholder: string = ''): Promise<string | null> => {
  return new Promise((resolve) => {
    // 创建遮罩层 - macOS风格的透明模糊背景
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-md';
    
    // 创建模态框内容 - macOS透明风格
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden flex flex-col backdrop-blur-xl';
    modal.appendChild(modalContent);

    // 标题区域 - macOS风格
    const titleContainer = document.createElement('div');
    titleContainer.className = 'px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-750/80';
    modalContent.appendChild(titleContainer);
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'text-base font-medium text-gray-900 dark:text-gray-100';
    titleElement.textContent = title;
    titleContainer.appendChild(titleElement);

    // 内容区域 - 添加最大高度限制
    const contentArea = document.createElement('div');
    contentArea.className = 'px-6 py-4 max-h-[40vh] overflow-y-auto';
    modalContent.appendChild(contentArea);

    // 输入框 - macOS风格
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full px-3 py-2 text-sm bg-white/80 dark:bg-gray-700/80 border border-gray-300/70 dark:border-gray-600/70 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 backdrop-blur-sm';
    input.placeholder = placeholder;
    contentArea.appendChild(input);

    // 按钮容器 - macOS风格
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-end gap-3 px-6 py-4 bg-gray-50/80 dark:bg-gray-750/80 border-t border-gray-200/50 dark:border-gray-700/50';
    
    // 取消按钮 - macOS风格（透明按钮）
    const cancelButton = document.createElement('button');
    cancelButton.className = 'px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-700/60 border border-gray-300/50 dark:border-gray-600/50 rounded-md hover:bg-white/80 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-1 focus:ring-gray-400 backdrop-blur-sm';
    cancelButton.textContent = '取消';

    // 确认按钮 - macOS风格（透明蓝色主按钮）
    const confirmButton = document.createElement('button');
    confirmButton.className = 'px-4 py-2 text-sm font-normal text-white bg-blue-600/90 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 backdrop-blur-sm';
    confirmButton.textContent = '确认';

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    modalContent.appendChild(buttonContainer);

    // 添加到body
    document.body.appendChild(modal);
    
    // 聚焦到输入框
    input.focus();
    input.select();

    // 确认按钮点击事件
    confirmButton.onclick = () => {
      const value = input.value.trim();
      document.body.removeChild(modal);
      resolve(value || null);
    };

    // 取消按钮点击事件
    cancelButton.onclick = () => {
      document.body.removeChild(modal);
      resolve(null);
    };

    // 回车键确认
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmButton.click();
      } else if (e.key === 'Escape') {
        cancelButton.click();
      }
    });

    // ESC 键关闭弹窗
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        resolve(null);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 点击遮罩层关闭弹窗（macOS风格）
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cancelButton.click();
      }
    });
  });
};

// 新增公共方法 - 优化为macOS风格（透明背景）
export const createAIModal = (editor: any, prompt: string,range:Range) => {
  editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
  // 创建弹出框 - macOS风格半透明背景
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-xl';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white/90 dark:bg-gray-800/95 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 border border-white/20 dark:border-gray-700/30 overflow-hidden flex flex-col backdrop-blur-2xl animate-in zoom-in-95 duration-300';
  modalContent.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05) inset';
  modal.appendChild(modalContent);

  // 标题区域 - macOS风格
  const titleContainer = document.createElement('div');
  titleContainer.className = 'px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30 bg-white/60 dark:bg-gray-800/60';
  titleContainer.innerHTML = '<h3 class="text-base font-medium text-gray-900 dark:text-gray-100 tracking-wide">AI 内容生成</h3>';
  modalContent.appendChild(titleContainer);

  // 创建内容显示区域 - 添加高度限制和滚动
  const contentDiv = document.createElement('div');
  contentDiv.className = 'prose prose-sm dark:prose-invert p-6 overflow-y-auto flex-1 w-full max-w-none bg-transparent max-h-[60vh]';
  modalContent.appendChild(contentDiv);

  // 创建加载状态指示器
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'flex items-center justify-center p-8 text-gray-500 dark:text-gray-400';
  loadingDiv.innerHTML = `
    <div class="flex flex-col items-center space-y-3">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      <div class="text-sm">AI 正在思考中...</div>
    </div>
  `;
  contentDiv.appendChild(loadingDiv);

  // 创建操作按钮 - macOS风格
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex justify-end gap-3 px-6 py-4 bg-white/40 dark:bg-gray-800/40 border-t border-gray-200/20 dark:border-gray-700/20';
  
  // 取消按钮 - macOS风格
  const cancelButton = document.createElement('button');
  cancelButton.className = 'px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/40 rounded-lg hover:bg-white/80 dark:hover:bg-gray-700/70 focus:outline-none focus:ring-1 focus:ring-gray-400 backdrop-blur-sm transition-all duration-200';
  cancelButton.textContent = '取消';

  // 确认按钮 - macOS风格
  const confirmButton = document.createElement('button');
  confirmButton.className = 'px-4 py-2 text-sm font-normal text-white bg-gradient-to-r from-blue-600/90 to-blue-500/90 rounded-lg hover:from-blue-600 hover:to-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 backdrop-blur-sm transition-all duration-200 shadow-sm';
  confirmButton.textContent = '确认';

  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(confirmButton);
  modalContent.appendChild(buttonContainer);

  // 添加到body
  document.body.appendChild(modal);
  let buffer = '';

  // 使用流式数据处理逻辑
  const handleStreamChunk = (_event: any, chunk: string) => {
    buffer += chunk;
    
    // 移除加载指示器（如果存在）
    if (loadingDiv && loadingDiv.parentNode) {
      loadingDiv.remove();
    }
    
    // 使用React Markdown渲染器替代正则表达式
    const root = createRoot(contentDiv);
    root.render(
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // 自定义组件样式
            h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-medium mb-1 text-gray-900 dark:text-gray-100">{children}</h3>,
            p: ({ children }) => <p className="mb-2 text-gray-800 dark:text-gray-200 leading-relaxed">{children}</p>,
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400">
                  {children}
                </code>
              ) : (
                <code className={className}>{children}</code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mb-3 border dark:border-gray-700">
                {children}
              </pre>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-700 dark:text-gray-300 mb-2">
                {children}
              </blockquote>
            ),
            strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
            em: ({ children }) => <em className="italic text-gray-800 dark:text-gray-200">{children}</em>,
            a: ({ href, children }) => (
              <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            hr: () => <hr className="border-gray-300 dark:border-gray-600 my-4" />,
            table: ({ children }) => (
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 mb-3">
                {children}
              </table>
            ),
            th: ({ children }) => (
              <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                {children}
              </td>
            ),
          }}
        >
          {buffer}
        </ReactMarkdown>
      </div>
    );
  };

  const handleStreamComplete = () => {
    // 流式传输完成，清理监听器
    cleanup();
  };

  const handleStreamError = (_event: any, errorMessage: string) => {
    // 移除加载指示器（如果存在）
    if (loadingDiv && loadingDiv.parentNode) {
      loadingDiv.remove();
    }
    contentDiv.innerHTML = `<div class="text-red-500 p-2">生成失败: ${errorMessage}</div>`;
    cleanup();
  };

  // 清理监听器函数
  const cleanup = () => {
    (window as any).electronAPI.removeListener('ai:streamChunk', handleStreamChunk);
    (window as any).electronAPI.removeListener('ai:streamComplete', handleStreamComplete);
    (window as any).electronAPI.removeListener('ai:streamError', handleStreamError);
  };

  // 注册监听器
  (window as any).electronAPI.on('ai:streamChunk', handleStreamChunk);
  (window as any).electronAPI.on('ai:streamComplete', handleStreamComplete);
  (window as any).electronAPI.on('ai:streamError', handleStreamError);

  // 调用AI接口进行文本续写
  (window as any).electronAPI.ai.generateStream(prompt, 'generate')
    .catch((error: Error) => {
      // 移除加载指示器（如果存在）
      if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.remove();
      }
      contentDiv.innerHTML = `<div class="text-red-500 p-2">生成失败: ${error.message}</div>`;
      cleanup();
    });

  // 确认按钮点击事件
  confirmButton.onclick = () => {
    // 获取文档末尾位置
    const docSize = editor.state.doc.content.size;
    // 在文档末尾插入，并确保在新行开始
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContentAt(docSize, "\n" + contentDiv.innerHTML)
      .run();
    document.body.removeChild(modal);
  };

  // 取消按钮点击事件
  cancelButton.onclick = () => {
    document.body.removeChild(modal);
    cleanup();
  };

  // 点击遮罩层关闭弹窗（macOS风格）
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cancelButton.click();
    }
  });
};

export const suggestionItems = createSuggestionItems([

  {
    title: "Text",
    description: "Just start typing with plain text.",
    searchTerms: ["p", "paragraph"],
    icon: <Text size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do list.",
    searchTerms: ["todo", "task", "list", "check", "checkbox"],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading.",
    searchTerms: ["title", "big", "large"],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    searchTerms: ["subtitle", "medium"],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    searchTerms: ["subtitle", "small"],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list.",
    searchTerms: ["unordered", "point"],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering.",
    searchTerms: ["ordered"],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote.",
    searchTerms: ["blockquote"],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").toggleBlockquote().run(),
  },
  {
    title: "Code",
    description: "Capture a code snippet.",
    searchTerms: ["codeblock"],
    icon: <Code size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  
  {
    title: "Image",
    description: "Upload an image from your computer.",
    searchTerms: ["photo", "picture", "media"],
    icon: <ImageIcon size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // upload image
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        if (input.files?.length) {
          const file = input.files[0];
          const pos = editor.view.state.selection.from;
          uploadFn(file, editor.view, pos);
        }
      };
      input.click();
    },
  },
  {
    title: "Mermaid 图表",
    description: "添加 Mermaid 流程图",
    icon: <ChartArea className="w-6 h-6" />,
    command: ({ editor, range }) => {
      editor.chain().focus();
      // 创建弹出框
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl';
      modal.appendChild(modalContent);

      // 创建标题
      const header = document.createElement('div');
      header.className = 'text-lg font-medium mb-4';
      header.textContent = '编辑 Mermaid 图表';
      modalContent.appendChild(header);

      // 创建文本输入框
      const textarea = document.createElement('textarea');
      textarea.value=`graph TD;
    A[用户输入凭据] --> B{系统验证凭据};
    B -- 有效 --> C[授予访问权限];
    B -- 无效 --> D[显示错误信息];`;
      textarea.className = 'w-full h-40 p-3 border rounded-lg mb-4 font-mono text-sm whitespace-pre tab-size-4';
      textarea.style.tabSize = '4';
      textarea.wrap = 'off';
      textarea.spellcheck = false;
      modalContent.appendChild(textarea);

      // 创建预览区域
      const preview = document.createElement('div');
      preview.className = 'w-full p-4 border rounded-lg mb-4 bg-gray-50';
      modalContent.appendChild(preview);

      // 预览更新函数
      const updatePreview = async () => {
        try {
          const id = `preview-${Math.random().toString(36).substr(2, 9)}`;
          preview.innerHTML = '';
          const previewContainer = document.createElement('div');
          previewContainer.classList.add('mermaid');
          previewContainer.setAttribute('id', id);
          previewContainer.textContent = textarea.value;
          preview.appendChild(previewContainer);
          
          await mermaid.init(undefined, previewContainer);
        } catch (error) {
          preview.innerHTML = '<div class="text-red-500 p-2">预览失败</div>';
        }
      };

      // 使用防抖优化实时预览
      let debounceTimer: NodeJS.Timeout;
      textarea.oninput = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          updatePreview();
        }, 300);
      };

      // 创建按钮容器
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'flex justify-end gap-2';
      
      // 创建确认按钮
      const confirmButton = document.createElement('button');
      confirmButton.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700';
      confirmButton.textContent = '确认';
      
      // 创建取消按钮
      const cancelButton = document.createElement('button');
      cancelButton.className = 'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200';
      cancelButton.textContent = '取消';

      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(confirmButton);
      modalContent.appendChild(buttonContainer);

      // 添加到body
      document.body.appendChild(modal);

      // 初始预览
      updatePreview();

       // 确认按钮点击事件
       confirmButton.onclick = async () => {
        try {
          const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'mermaid',
              attrs: {
                code: textarea.value,
                diagramId: diagramId
              }
            })
            .run();

            
          document.body.removeChild(modal);
        } catch (error) {
          console.error('Mermaid 渲染错误:', error);
          alert('图表渲染失败，请检查语法');
        }
      };

      // 取消按钮点击事件
      cancelButton.onclick = () => {
        document.body.removeChild(modal);
      };

      // ESC 键关闭弹窗
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
    },
  },
  
  {
  title: "表格",
  description: "插入一个3x3的表格",
  searchTerms: ["table", "表格"],
  icon: <TableIcon size={18} />,
  command: ({ editor, range }) => {
    // @ts-ignore
    editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  },
},
  {
    title: "选择视频",
    description: "选择本地视频文件",
    searchTerms: ["video", "选择", "本地视频"],
    icon: <VideoIcon size={18} />,
    command: async ({ editor, range }) => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.filesystem?.selectMediaFile) {
          alert('文件选择功能不可用');
          return;
        }

        const result = await electronAPI.filesystem.selectMediaFile('video');
        
        if (result.success && result.fileUrl) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([{
              type: 'video',
              attrs: {
                src: result.fileUrl,
                title: result.fileName,
                controls: true,
                width: '100%',
                height: '400'
              }
            }])
            .run();
        } else if (result.error && result.error !== '用户取消了选择') {
          alert('视频选择失败: ' + result.error);
        }
      } catch (error) {
        console.error('视频选择错误:', error);
        alert('视频选择失败: ' + (error as Error).message);
      }
    },
  },
  {
    title: "选择音频",
    description: "选择本地音频文件",
    searchTerms: ["audio", "选择", "本地音频", "音乐"],
    icon: <ImageIcon size={18} />, // 暂时使用ImageIcon，后续可以添加音频图标
    command: async ({ editor, range }) => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.filesystem?.selectMediaFile) {
          alert('文件选择功能不可用');
          return;
        }

        const result = await electronAPI.filesystem.selectMediaFile('audio');
        
        if (result.success && result.fileUrl) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([{
              type: 'audio',
              attrs: {
                src: result.fileUrl,
                title: result.fileName,
                controls: true,
                preload: 'metadata'
              }
            }])
            .run();
        } else if (result.error && result.error !== '用户取消了选择') {
          alert('音频选择失败: ' + result.error);
        }
      } catch (error) {
        console.error('音频选择错误:', error);
        alert('音频选择失败: ' + (error as Error).message);
      }
    },
  },
  {
    title: "Bilibili 视频",
    description: "嵌入 Bilibili 视频", 
    searchTerms: ["video", "bilibili", "embed"],
    icon: <VideoIcon size={18} />,
    command: async ({ editor, range }) => {
      const bvid = await createInputModal("请输入Bilibili视频BV号", "例如: BV1Bu4m1F7zv");
      // const bvid='BV1Bu4m1F7zv'
      if (!bvid) return;
      
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([{
          type: 'iframe',
          attrs: {
            src: `https://player.bilibili.com/player.html?bvid=${bvid}&p=1&autoplay=0&danmaku=0`,
            scrolling: 'no',
            border: '0',
            frameborder: 'no',
            framespacing: '0',
            allowfullscreen: 'true',
            allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; autoplay; fullscreen',
            sandbox: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms',
            width: '100%',
            height: '500',
            class: 'w-full aspect-video rounded-lg'
          }
        }])
        .run();
    },
  },
  {
    title: "短视频文案生成",
    description: "根据已有内容生成短视频文案",
    icon: <Sparkles size={18} />,
    command: ({ editor, range }) => {
      const text = editor.getText();
      const prompt = `你是一位擅长撰写精简简洁爆款短视频脚本的写作助力，能够根据已有文本创作吸引目标用户留存的论文。

      给出3个爆款标题：
      - 使用悬念、反差性提问、数字和数据吸引注意力。
      - 使用情感词汇、个人经历、触发危机意识或希望引发共鸣。
      - 运用幽默、比喻、提问式标题创造新颖感。

      给出1个视频简介：概括视频内容

      根据文案类型随机选取一个结构：
      1.PREP结构（知识分享、经验传递、观点表达）： P（观点）：亮出核心观点。R（理由）：解释观点的依据。E（案例）：用案例证明观点。P（观点回归）：重申结论。
      2.对比结构（产品评测、生活技巧、错误纠正）：错误操作 + 负面结果 + 正确方法 + 正向结果。
      3.FIRE结构（行业分析、热点解读、深度科普）：F（事实） + I（解读） + R（反应） + E（结果）。
      4.RIDE结构（产品推广、行动号召、风险提示）：R（风险） + I（利益） + D（差异） + E（影响）。

      按照选取的结构按照如下顺序编写文案内容，要求隐晦的推荐产品：
      - 引人入胜的开头：使用目标用户痛点抓住注意力，理解目标受众的情感需求，引发兴趣和共鸣。
      - 提供实际案例：通过真实经历和情感故事拉近与观众的距离，增强说服力和实用性。
      - 生动描述细节：增强真实感画面感。
      - 设立冲突或疑问：引发好奇心和关注度。
      - 提供解决方案：针对问题给出具体建议。
      - 呼吁行动：引导观众采取实际行动。

      给出平台适应能力
      - 给出b站、小红书平台的优化推荐。
      
      给出一行关键词提高搜索引擎排名。
      已有文本如下：
` + text;
    createAIModal(editor, prompt,range);
    },
  },
  {
    title: "教程文案生成",
    description: "根据已有内容生成教程文案",
    icon: <BookOpen size={18} />,
    command: ({ editor, range }) => {
      const text = editor.getText();
      const prompt = `你是一位擅长撰写技术教程的写作助手，能够根据已有文本创作清晰易懂的技术教程。

      请按照以下结构编写教程内容：
      1. 教程目标：明确说明本教程将教会读者什么
      2. 前置知识：列出学习本教程所需的基础知识
      3. 环境准备：说明需要安装的工具和配置
      4. 核心步骤：
        - 分步骤详细说明操作过程
        - 每个步骤包含必要的代码示例
        - 解释关键概念和原理
        - 提供常见问题解决方案
      5. 总结回顾：概括教程要点
      6. 扩展学习：提供相关进阶学习资源
      7. 注意事项：列出可能遇到的问题和解决方法

      写作要求：
      - 语言简洁明了，避免复杂术语
      - 代码示例要完整且可运行
      - 重要概念要配图说明
      - 提供实际应用场景
      - 包含最佳实践建议
      - 给出调试和排错技巧

      已有文本如下：
` + text;
    createAIModal(editor, prompt,range);
    },
  },
  {
    title: "课程文案生成",
    description: "根据已有内容生成专业的课程文案",
    icon: <Users size={18} />,
    command: ({ editor, range }) => {
      const text = editor.getText();
      const prompt = `你是一位资深的教育内容专家，能够根据已有文本生成专业的课程文案。

      请按照以下要求生成课程文案：
      1. 课程概述：
        - 课程名称
        - 课程目标
        - 适用人群
        - 课程时长
        - 学习方式

      2. 课程大纲：
        - 模块划分
        - 每个模块的学习目标
        - 知识点列表
        - 课时安排

      3. 课程特色：
        - 突出课程亮点
        - 说明教学方法
        - 展示学习成果
        - 提供学习支持

      4. 文案要求：
        - 语言简洁有力
        - 突出课程价值
        - 包含吸引人的标题
        - 使用列表和表格组织内容
        - 重要内容使用加粗或高亮

      5. 营销文案：
        - 编写课程宣传语
        - 设计课程亮点
        - 提供常见问题解答
        - 编写学员评价模板

      已有文本如下：
` + text;

      createAIModal(editor, prompt,range);
    },
  },
    {
    title: "何同学风格文案",
    description: "学习何同学的文案风格：接地气+比喻+故事",
    icon: <Users size={18} />,
    command: ({ editor, range }) => {
      const text = editor.getText();
      const prompt = `
你现在是B站UP主"老师好我叫何同学"，擅长用生活化的语言和生动的比喻把复杂的技术概念讲清楚。请根据已有内容，创作一段何同学风格的文案。

何同学文案特点：
1. 接地气：把专业术语翻译成大白话，让普通人能听懂
2. 善用比喻：用生活中熟悉的东西来解释抽象概念
3. 讲故事：不直接讲道理，而是分享自己的真实经历
4. 有温度：文案里有情感，能引起共鸣

写作要求：
- 用第一人称"我"来讲故事
- 多用人称代词"你""我们"，像跟朋友聊天
- 不要编造数据和研究报告
- 用生活化的比喻，比如把网络比作空气，把数据比作水流
- 文案要有起承转合，像讲一个小故事
- 结尾要有情感升华，让人印象深刻

结构参考：
开头：从个人经历或日常场景切入
发展：遇到什么问题，怎么解决的
高潮：用比喻解释核心概念
结尾：回到个人感受，引发共鸣

示例风格：
"那天我真的好开心啊，好像我的整个世界，都可以放进这块屏幕里"
"网络应该像空气一样，24小时给我们提供生命中最重要的资源，但我们甚至意识不到它的存在"
"从前我的世界是纯黑色的，直到大家让这里闪起了点点星光"

已有内容如下：
` + text;

      createAIModal(editor, prompt,range);
    },
  },
  
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
