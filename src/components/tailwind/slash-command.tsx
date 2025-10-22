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
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-gray-200 bg-opacity-20';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-lg w-full max-w-md p-6';
    modal.appendChild(modalContent);

    // 标题
    const titleElement = document.createElement('h3');
    titleElement.className = 'text-lg font-semibold mb-4 text-gray-900';
    titleElement.textContent = title;
    modalContent.appendChild(titleElement);

    // 输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4';
    input.placeholder = placeholder;
    modalContent.appendChild(input);

    // 按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-end gap-2';
    
    const confirmButton = document.createElement('button');
    confirmButton.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700';
    confirmButton.textContent = '确认';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200';
    cancelButton.textContent = '取消';

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    modalContent.appendChild(buttonContainer);

    // 添加到body
    document.body.appendChild(modal);
    
    // 聚焦到输入框
    input.focus();

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
  });
};

// 新增公共方法
const createAIModal = (editor: any, prompt: string,range:Range) => {
  editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
  // 创建弹出框
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-gray-200 bg-opacity-20';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white rounded-lg shadow-lg w-full max-w-2xl h-[500px] flex flex-col';
  modal.appendChild(modalContent);

  // 创建内容显示区域
  const contentDiv = document.createElement('div');
  contentDiv.className = 'prose prose-sm p-6 overflow-y-auto flex-1 w-full max-w-2xl';
  modalContent.appendChild(contentDiv);

  // 创建操作按钮
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex justify-end gap-2 p-4 border-t border-gray-200';
  
  const confirmButton = document.createElement('button');
  confirmButton.className = 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700';
  confirmButton.textContent = '确认';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200';
  cancelButton.textContent = '取消';

  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(confirmButton);
  modalContent.appendChild(buttonContainer);

  // 添加到body
  document.body.appendChild(modal);
  let buffer = '';

  // 使用流式数据处理逻辑
  const handleStreamChunk = (_event: any, chunk: string) => {
    buffer += chunk;
    
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
  };
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
    title: "上传视频",
    description: "上传本地视频文件",
    searchTerms: ["video", "upload", "本地视频"],
    icon: <VideoIcon size={18} />,
    command: async ({ editor, range }) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const result = await mediaUploadFn(file, 'video');
          if (result.success && result.path) {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([{
                type: 'video',
                attrs: {
                  src: result.path,
                  title: file.name,
                  controls: true,
                  width: '100%',
                  height: '400'
                }
              }])
              .run();
          } else {
            alert('视频上传失败: ' + (result.error || '未知错误'));
          }
        } catch (error) {
          console.error('视频上传错误:', error);
          alert('视频上传失败: ' + (error as Error).message);
        }
      };
      input.click();
    },
  },
  {
    title: "上传音频",
    description: "上传本地音频文件",
    searchTerms: ["audio", "upload", "本地音频", "音乐"],
    icon: <ImageIcon size={18} />, // 暂时使用ImageIcon，后续可以添加音频图标
    command: async ({ editor, range }) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const result = await mediaUploadFn(file, 'audio');
          if (result.success && result.path) {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([{
                type: 'audio',
                attrs: {
                  src: result.path,
                  title: file.name,
                  controls: true,
                  preload: 'metadata'
                }
              }])
              .run();
          } else {
            alert('音频上传失败: ' + (result.error || '未知错误'));
          }
        } catch (error) {
          console.error('音频上传错误:', error);
          alert('音频上传失败: ' + (error as Error).message);
        }
      };
      input.click();
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
  
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
