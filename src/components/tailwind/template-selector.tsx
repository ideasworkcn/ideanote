import { useState, useRef, useEffect } from "react";
import { FileText, Sparkles, BookOpen, Users, Wand2, X, Search } from "lucide-react";
import { createAIModal } from "./slash-command";
import { Range } from '@tiptap/core';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TemplateItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

const templateItems: TemplateItem[] = [
  {
    title: "短视频文案",
    description: "生成吸引人的短视频脚本",
    icon: <Sparkles size={16} />,
    prompt: `你是一位擅长撰写精简简洁爆款短视频脚本的写作助力，能够根据已有文本创作吸引目标用户留存的论文。

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

给出一行关键词提高搜索引擎排名。`
  },
  {
    title: "教程文案",
    description: "创建清晰的技术教程",
    icon: <BookOpen size={16} />,
    prompt: `你是一位擅长撰写技术教程的写作助手，能够根据已有文本创作清晰易懂的技术教程。

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
- 给出调试和排错技巧`
  },
  {
    title: "课程文案",
    description: "制作专业的课程内容",
    icon: <Users size={16} />,
    prompt: `你是一位资深的教育内容专家，能够根据已有文本生成专业的课程文案。

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
  - 编写学员评价模板`
  },
  {
    title: "何同学风格",
    description: "生活化比喻+故事叙述",
    icon: <Users size={16} />,
    prompt: `你现在是B站UP主"老师好我叫何同学"，擅长用生活化的语言和生动的比喻把复杂的技术概念讲清楚。

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
结尾：回到个人感受，引发共鸣`
  },
  {
    title: "通用写作",
    description: "基础的内容创作和优化",
    icon: <FileText size={16} />,
    prompt: `你是一位专业的写作助手，请根据提供的文本内容进行创作和优化。

写作要求：
1. 保持原文的核心信息和主旨
2. 使用清晰、简洁的语言表达
3. 结构合理，逻辑清晰
4. 适当增加细节和例子来丰富内容
5. 确保内容具有实用性和可读性
6. 根据内容类型选择合适的写作风格

请基于以下文本进行创作：`
  }
];

interface TemplateSelectorProps {
  editor: any;
  onClose: () => void;
}

export const TemplateSelector = ({ editor, onClose }: TemplateSelectorProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleTemplateSelect = (template: TemplateItem) => {
    // Try to get editor instance - check both passed prop and global window.editorInstance
    const activeEditor = editor || (window as any).editorInstance;
    
    console.log('Template selector - Editor instance check:', {
      hasEditor: !!activeEditor,
      hasWindowEditor: !!(window as any).editorInstance,
      hasPropEditor: !!editor,
      editorType: typeof activeEditor
    });
    
    if (!activeEditor) {
      alert('编辑器尚未准备好，请稍后再试');
      return;
    }
    
    // Additional check to ensure editor has required methods
    if (!activeEditor.getText || !activeEditor.state || !activeEditor.state.selection) {
      console.error('Editor instance is incomplete:', activeEditor);
      alert('编辑器初始化不完整，请刷新页面重试');
      return;
    }
    
    console.log('Editor validation passed, proceeding with template application');
    
    const text = activeEditor.getText();
    const fullPrompt = template.prompt + '\n\n' + text;
    
    // 获取文档末尾位置，而不是当前光标位置
    const docSize = activeEditor.state.doc.content.size;
    const range = {
      from: docSize,
      to: docSize
    } as Range;
    
    console.log('Inserting at document end:', {
      docSize: docSize,
      textLength: text.length,
      lastChars: text.substring(Math.max(0, text.length - 50))
    });
    
    createAIModal(activeEditor, fullPrompt, range);
    onClose();
  };

  // Filter templates based on search query
  const filteredTemplates = templateItems.filter(template =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-xl animate-in fade-in-0 duration-300">
      <div 
        ref={modalRef}
        className="bg-white/90 dark:bg-gray-800/95 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 border border-white/20 dark:border-gray-700/30 overflow-hidden backdrop-blur-2xl animate-in zoom-in-95 duration-300"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
        }}
      >
        {/* Header - macOS style */}
        <div className="px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30 bg-white/60 dark:bg-gray-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 tracking-wide">选择模板</h3>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={14} />
              <Input
                type="text"
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm w-full bg-white/50 dark:bg-gray-700/50 border-gray-200/50 dark:border-gray-600/50 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-6 w-6 flex items-center justify-center rounded-full bg-gray-200/50 hover:bg-gray-300/70 dark:bg-gray-600/50 dark:hover:bg-gray-500/70 transition-all duration-150 group"
            aria-label="关闭"
          >
            <X size={12} className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
          </button>
        </div>

        {/* Template Grid - macOS style */}
        <ScrollArea className="h-[480px]">
          <div className="p-5">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">未找到匹配的模板</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map((template, index) => (
                  <div
                    key={index}
                    className={cn(
                      "group cursor-pointer transition-all duration-300 ease-out rounded-xl",
                      "bg-white/40 dark:bg-gray-700/30 border border-white/50 dark:border-gray-600/30",
                      "hover:bg-white/70 dark:hover:bg-gray-600/50 hover:shadow-xl hover:scale-[1.02]",
                      "backdrop-blur-sm hover:backdrop-blur-md"
                    )}
                    onClick={() => handleTemplateSelect(template)}
                    style={{
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      transform: 'translateZ(0)'
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ease-out",
                          "bg-gradient-to-br from-blue-100/90 to-blue-200/70 dark:from-blue-900/40 dark:to-blue-800/30",
                          "text-blue-600 dark:text-blue-400 shadow-sm",
                          "group-hover:scale-110 group-hover:shadow-md group-hover:from-blue-200/90 group-hover:to-blue-300/80",
                          "dark:group-hover:from-blue-800/50 dark:group-hover:to-blue-700/40"
                        )}>
                          <div className="transition-transform duration-300 group-hover:scale-110">
                            {template.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-tight tracking-wide">
                            {template.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                            {template.description}
                          </p>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40 shadow-sm">
                              AI 增强
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - macOS style */}
        <div className="px-6 py-3 bg-white/40 dark:bg-gray-800/40 border-t border-gray-200/20 dark:border-gray-700/20">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center opacity-80">
            选择模板后，AI 将根据您的内容生成相应的文案
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;