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
const createAIModal = (editor: any, prompt: string,range:Range) => {
  editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
  // 创建弹出框 - macOS风格透明背景
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-md';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-2xl w-full max-w-3xl mx-4 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden flex flex-col backdrop-blur-xl';
  modal.appendChild(modalContent);

  // 标题区域 - macOS风格
  const titleContainer = document.createElement('div');
  titleContainer.className = 'px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-750/80';
  titleContainer.innerHTML = '<h3 class="text-base font-medium text-gray-900 dark:text-gray-100">AI 内容生成</h3>';
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

  // 创建操作按钮 - macOS风格（更透明）
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex justify-end gap-3 px-6 py-4 bg-gray-50/60 dark:bg-gray-750/60 border-t border-gray-200/40 dark:border-gray-700/40';
  
  // 取消按钮 - macOS风格（透明按钮）
  const cancelButton = document.createElement('button');
  cancelButton.className = 'px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 border border-gray-300/40 dark:border-gray-600/40 rounded-md hover:bg-white/70 dark:hover:bg-gray-700/70 focus:outline-none focus:ring-1 focus:ring-gray-400 backdrop-blur-sm';
  cancelButton.textContent = '取消';

  // 确认按钮 - macOS风格（透明蓝色主按钮）
  const confirmButton = document.createElement('button');
  confirmButton.className = 'px-4 py-2 text-sm font-normal text-white bg-blue-600/80 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 backdrop-blur-sm';
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
    const selection = editor.view.state.selection;
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContentAt(selection.to + 1, contentDiv.innerHTML)
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
      const prompt = `你是一位擅长撰写爆款短视频脚本的写作助力，能够根据已有文本创作吸引目标用户留存的论文。

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
    title: "野兽先生 YouTube 文案创作提示词",
    description: "根据已有内容生成专业的视频文案",
    icon: <Users size={18} />,
    command: ({ editor, range }) => {
      const text = editor.getText();
      const prompt = `
要求：根据已有的文本内容，创作一个专业的 YouTube 视频脚本文案。使用大白话，专注于原先文案内容，不要偏离。

叙事结构模板设计

开场钩子设计

前 3 秒必须出现视觉冲击画面（如意外事件 / 数据对比 / 反向提问），同时叠加画外音："你以为 [常识认知]？但 90% 的人都错了！"。示例：展示 "月入 3 千存钱" 画面，配 "靠工资永远存不下 100 万？今天这个方法让我 3 年存到了"。

问题提出框架

第 5-8 秒用具体场景引发共鸣，格式为 "[目标人群] 每天都在 [痛点行为]，却不知道 [隐藏损失] 正在发生"。需包含 1 个可量化数据（如 "每天浪费 8小时"）和 1 个情感触发词（如 "焦虑 / 后悔 / 无奈"）。

解决方案呈现

15 秒处必须给出 "伪解决方案"，20 秒处用 "但是" 转折揭示真实方法。结构示例：" 很多人推荐 [流行方法]，但是他们忽略了 [关键变量]—— 真正有效的是 [反常识策略]"，需同步展示对比数据图表。

转折节点设计

在视频 30 秒、60 秒、90 秒三个时间点设置强制转折：

30 秒："你以为这就完了？真正的关键藏在 [细节处]"

60 秒：" 按照这个步骤操作，因此会产生 [意外结果]"

90 秒："当所有人都在 [常规行动] 时，高手已经用 [逆向思维] 做到了 [惊人成果]"

"但是 / 因此" 转折词使用场景及示例

认知颠覆型转折

使用场景：当观众形成初步判断时，用 "但是" 揭示底层逻辑。

示例：展示 "每天喝 8 杯水" 养生画面→"但是哈佛医学院最新研究证实，过量饮水会导致水中毒 —— 真正的补水公式是体重（kg）×35ml"（需标注研究发布日期）。

结果反转型转折

使用场景：在给出常规解决方案后，用 "因此" 引出连锁反应。

示例：演示 "每天存 50 元" 计算→" 坚持 30 天后，因此你的消费习惯会发生质变 —— 这就是行为心理学中的 ' 最小改变法则 '"（同步弹出行为心理学研究论文截图）。

方法升级型转折

使用场景：在观众接受基础方案时，用 "但是" 推出进阶策略。

示例：讲解 "番茄工作法" 操作→" 但是效率专家发现，25 分钟专注后插入 3 分钟高强度运动，因此大脑活跃度提升 40%（引用《自然》杂志神经科学研究）"。

结尾反转创意方向（附数据验证模式）

数据颠覆式反转

模式：给出与开篇完全相反的数据结论，配合惊讶表情特写。

示例：开场 "存钱需要克制消费"→结尾 "因此我鼓励每月挥霍 1 次 —— 这种 ' 目标奖励机制 ' 让我的储蓄率反而提升了 27%"（展示银行流水对比图）。

留存数据：采用该模式的视频在结尾前 5 秒跳出率降低 41%（来源：野兽先生 2024 年 Q3 视频数据报告）。

行动召唤反转

模式：以 "现在立即行动" 引导后突然停顿，揭示 "真正的第一步"。

示例：" 马上打开你的手机备忘录，但是不要写待办清单 —— 先删除所有 APP，这才是提升效率的关键 "（展示手机屏幕操作过程）。

留存数据：命令式反转结尾比普通结尾完播率高 29%。

身份认同反转

模式：从 "专家视角" 切换为 "同路人视角"，降低距离感。

示例：全程西装革履讲解理财→结尾脱外套露出 T 恤 " 说实话，3 年前我也是月光族，因此这些方法都是摔过跟头才总结的 "（背景切换为出租屋场景）。

适用领域：个人成长类视频，用户评论互动率提升 63%。

未来悬念反转

模式：在给出完整方案后，抛出 "但这只是开始" 的长期规划。

示例：演示完 "3 个月减脂计划"→结尾 " 当你完成这个周期，因此会面临肌肉流失的新问题 —— 关注我，下期揭秘增肌减脂同步进行的秘诀 "（弹出下期预告封面）。

数据效果：该模式观众追更率提升 58%，适合系列化内容。

公益升华反转

模式：从个人利益上升到社会价值，触发情感共鸣。

示例：讲解 "二手物品变现" 全流程→结尾 " 我把所有收益都捐给了流浪动物救助站，因此每学会一个技巧，就有 10 只小动物能吃饱饭 "（展示捐款记录和动物照片）。

平台偏好：YouTube 算法对公益相关内容推荐权重提升 35%。

视频留存率优化数据锚点

前 3 秒关键指标

视觉指标：画面亮度需比同类视频高 20%，必须出现 3 种以上颜色对比

音频指标：画外音语速保持每分钟 180-200 字，首句末尾音调提高 2 个音阶

数据标准：完播率基准值 45%，低于 38% 立即调整开场画面

15 秒留存锚点

必须出现 "你" 字至少 3 次，形成对话感

展示 1 个具体数字（如 "3 个步骤"" 节省 50% 成本 "）

数据警示线：15 秒跳出率＞55% 时，需在第 10 秒插入 "接下来的内容可能会颠覆你的认知"

30 秒互动设计

强制观众做 "思维动作"："现在暂停视频，在评论区打出你的 [目标数字]"

画面出现倒计时动画（如 "3 秒后揭晓答案"）

留存目标：30 秒时观众留存率需≥初始人数的 65%

60 秒信息密度控制

每 15 秒必须出现 1 个新数据 / 案例 / 金句

文字卡片停留时间严格控制在 2.3 秒（±0.2 秒）

节奏标准：60 秒内完成 "问题 - 原因 - 案例 - 结论" 完整闭环

90 秒情绪峰值设计

此处音量需突然提高 10%，配合画面放大特效

抛出 "反常识金句"，格式为 "真正的 [领域关键词] 不是 [常识]，而是 [逆向观点]"

数据验证：该节点观众心率需比基线提升 25%（可通过弹幕速度监测）

结尾前 5 秒行动指令

必须包含 "点击头像"" 订阅 ""开启通知" 三个明确指引

语速降至每分钟 150 字，关键动词加重读音（如 "立即点击 ""务必订阅 "）

按钮设计：订阅按钮需闪烁 3 次，位置固定在画面右下角

整体时长控制

知识类视频严格控制在 2 分 30 秒 ±5 秒

案例类视频不超过 3 分钟，每增加 30 秒需多设置 1 个转折

数据模型：视频完播率与时长呈反比（R=-0.78），超过 4 分钟后完播率跌破 20%

使用执行说明

所有脚本生成后需通过以下 3 步验证：

检查 "但是 / 因此" 是否各出现 3 次以上

在时间轴对应位置标注数据锚点达标情况

结尾反转方案需从 5 个创意方向中明确勾选 1 个并标注预期留存率

生成的脚本需直接输出可拍摄的分镜脚本格式，包含 "时间点 | 画面内容 | 画外音 | 文字卡片 | 数据来源" 五列信息`
 + text;

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
