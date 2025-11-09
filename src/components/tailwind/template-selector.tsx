import { useState, useRef, useEffect } from "react";
import { X, Search, Edit3, Trash2, Plus, Save, Download, Upload, AlertTriangle } from "lucide-react";
import { createAIModal } from "./slash-command";
import { Range } from '@tiptap/core';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  getCustomTemplates, 
  saveCustomTemplate, 
  updateCustomTemplate, 
  deleteCustomTemplate,
  exportTemplates,
  importTemplates,
  CustomTemplate 
} from "@/lib/template-storage";

interface TemplateItem {
  title: string;
  description: string;
  prompt: string;
}

const templateItems: TemplateItem[] = [
  {
    title: "短视频文案",
    description: "生成吸引人的短视频脚本",
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
    prompt: `你是一位专业的写作助手，请根据提供的文本内容进行创作和优化。

写作要求：
1. 保持原文的核心信息和主旨
2. 使用清晰、简洁的语言表达
3. 结构合理，逻辑清晰
4. 适当增加细节和例子来丰富内容
5. 确保内容具有实用性和可读性
6. 根据内容类型选择合适的写作风格

请基于以下文本进行创作：`
  },
  {
    title: "康奈尔笔记模板",
    description: "结构化的 Cornell Notes，便于复盘与行动",
    prompt: `你是一位擅长康奈尔笔记（Cornell Notes）的知识整理助手，请基于已有文本生成结构化笔记，便于复盘、检索与行动。

【输出格式（严格使用 Markdown）】
- 使用二级标题（##）标示各部分；避免“### **标题**”的双重标记；不要复述原文或重复句段。
- 元信息使用 GFM 表格，列数一致，不在单元格中使用粗体/标题标记：

| 字段 | 值 |
| --- | --- |
| 主题 | <从上下文提取的主题> |
| 日期 | <YYYY-MM-DD> |
| 来源 | <文档/会议/链接等> |
| 目标 | <本次记录的关键目标（一句话）> |

## 提示栏（Cue）
- 关键词：<3–8 个关键词，单行一个>
- 关键问题：<2–5 个以问题形式呈现>
- 引导提示：<用于回忆的线索，不超过 5 条>

## 笔记栏（Notes）
- 按小节要点记录（短句、动词开头），避免长段落和重复表达。
- 可以用列表或小标题组织：
- 要点 1：<简洁陈述>
- 要点 2：<简洁陈述>
- 要点 3：<简洁陈述>

## 总结栏（Summary）
- 3–5 句话，总结核心观点与可迁移洞见。

## 行动清单（Action Items）
- [ ] 行动 1：<可执行、可验证、带截止时间>
- [ ] 行动 2：<可执行、可验证、带截止时间>
- [ ] 行动 3：<可执行、可验证、带截止时间>

【方法提示】
- 记录：只记事实与要点，避免冗余形容。
- 提炼：合并重复，标注关键词。
- 复述：用自己的话重述关键点。
- 反思：提出 2–3 个延伸问题或风险点。
- 行动：输出可验证的任务，并与目标对齐。

【注意】
- 若上下文缺失某项，明确标注“根据上下文未提供”。
- 保持信息密度，避免镜像式重复；不要将同一行拆成多段。`
  },
  {
    title: "论文模板",
    description: "规范的学术论文结构（摘要/方法/实验/结论等）",
    prompt: `你是一位学术写作助手，请基于已有文本生成规范的论文稿件草案。要求结构完整、表达清晰，并严格遵循 Markdown 输出规范。

【章节结构（使用二级或三级标题）】
## 标题
<论文标题（简洁明确）>

## 摘要（150–250 字）
- 目的：<研究动机与问题>
- 方法：<核心方法与设计>
- 结果：<关键指标与发现>
- 结论：<贡献与意义>

## 关键词
- <3–5 个关键词，单行一个>

## 引言
- 背景与问题陈述；现有痛点；本文贡献（列点说明）。

## 相关工作
- 3–6 条要点式综述；避免堆砌名词与重复描述。

## 方法
- 模型/算法/流程（分节说明）：
  - 假设与定义
  - 算法步骤或系统架构
  - 关键设计与创新点

## 实验设置
- 数据集与评估指标；对比基线；实现细节。

## 结果与讨论
- 关键结论与误差分析；局限性与适用范围。
- 如需表格，使用 GFM 表格且列数一致，不在单元格内使用粗体/标题：

| 指标 | 我们的方法 | 基线A | 基线B |
| --- | --- | --- | --- |
| Accuracy | <值> | <值> | <值> |
| F1 | <值> | <值> | <值> |

## 结论与未来工作
- 总结贡献，提出 2–3 个可行的后续方向。

## 参考文献
- [1] 作者. 标题. 会议/期刊, 年份.
- [2] 作者. 标题. 会议/期刊, 年份.

【写作要求】
- 仅基于上下文；缺失信息处标注“根据上下文未提供”。
- 禁止复述上下文或重复句段；标题只出现一次；避免“### **标题**”。
- 使用清晰小节与列表，减少冗余描述；保持信息密度。
- 表格与列表在生成过程中保持列数与结构一致，避免在单元格内使用粗体/标题标记。`
  }
];

interface TemplateSelectorProps {
  editor: any;
  onClose: () => void;
}

export const TemplateSelector = ({ editor, onClose }: TemplateSelectorProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // 加载自定义模板
  useEffect(() => {
    setCustomTemplates(getCustomTemplates());
  }, []);

  // 处理模板选择
  const handleTemplateSelect = (template: TemplateItem | CustomTemplate) => {
    setSelectedTemplate(template);
    
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
    const prompt = template.prompt;
    const fullPrompt = prompt + '\n\n' + text;
    
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

  // 开始编辑模板
  const handleEditTemplate = (template: CustomTemplate) => {
    setEditingTemplate({ ...template });
    setIsEditing(true);
  };

  // 保存编辑的模板
  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    // 移除 icon 字段
    const { icon, ...templateToSave } = editingTemplate;

    try {
      if (editingTemplate.id) {
        // 更新现有模板
        updateCustomTemplate(editingTemplate.id, templateToSave);
      } else {
        // 创建新模板
        saveCustomTemplate(templateToSave);
      }
      
      setCustomTemplates(getCustomTemplates());
      setIsEditing(false);
      setEditingTemplate(null);
    } catch (error) {
      alert('保存失败：' + (error as Error).message);
    }
  };

  // 处理删除模板
  const handleDeleteTemplate = (templateId: string) => {
    console.log('开始删除模板:', templateId);
    const templateToDelete = customTemplates.find(t => t.id === templateId);
    console.log('找到的模板:', templateToDelete);
    if (templateToDelete) {
      setEditingTemplate(templateToDelete);
      setShowDeleteConfirm(true);
      console.log('删除确认状态已设置');
    }
  };

  // 确认删除模板
  const confirmDeleteTemplate = () => {
    console.log('确认删除模板:', editingTemplate);
    if (editingTemplate) {
      try {
        console.log('调用 deleteCustomTemplate，模板ID:', editingTemplate.id);
        const result = deleteCustomTemplate(editingTemplate.id);
        console.log('删除结果:', result);
        console.log('重新获取自定义模板列表');
        setCustomTemplates(getCustomTemplates());
        console.log('关闭删除确认对话框');
        setShowDeleteConfirm(false);
        console.log('清空编辑模板状态');
        setEditingTemplate(null);
        console.log('模板删除完成');
      } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败：' + (error as Error).message);
      }
    } else {
      console.error('没有要删除的模板');
    }
  };

  // 创建新模板
  const handleCreateTemplate = () => {
    setEditingTemplate({
      id: '',
      title: '',
      description: '',
      prompt: '',
      icon: 'FileText',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setIsEditing(true);
  };

  // 导出模板
  const handleExportTemplates = () => {
    const data = exportTemplates();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ideanote-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入模板
  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const count = importTemplates(content);
        setCustomTemplates(getCustomTemplates());
        alert(`成功导入 ${count} 个模板`);
      } catch (error) {
        alert('导入失败：' + (error as Error).message);
      }
    };
    reader.readAsText(file);
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  // Filter templates based on search query
  const filteredTemplates = templateItems.filter(
    (template) =>
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomTemplates = customTemplates.filter(
    (template) =>
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 编辑界面
  if (isEditing && editingTemplate) {
    return (
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-2xl animate-in fade-in-0 duration-500 z-50 flex items-center justify-center">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20 dark:border-gray-700/30" ref={modalRef}>
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-white/30 dark:from-gray-900/50 dark:to-gray-800/30">
            <div>
              <h2 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingTemplate.id ? '编辑模板' : '创建模板'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                {editingTemplate.id ? '更新您的AI模板' : '创建新的AI模板'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingTemplate(null);
              }}
              className="p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Edit Form */}
          <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] bg-gradient-to-br from-white/50 to-gray-50/30 dark:from-gray-800/50 dark:to-gray-900/30">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                模板标题 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={editingTemplate.title}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                className="bg-white/70 dark:bg-gray-900/70 border-gray-200/60 dark:border-gray-700/60 rounded-2xl px-4 py-3 text-lg transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50"
                placeholder="为您的模板起个响亮的名字..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                模板描述 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={editingTemplate.description}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                className="bg-white/70 dark:bg-gray-900/70 border-gray-200/60 dark:border-gray-700/60 rounded-2xl px-4 py-3 transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50"
                placeholder="简要描述这个模板的用途..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                提示词内容 <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-500 ml-2">支持多行文本，Markdown格式</span>
              </label>
              <Textarea
                value={editingTemplate.prompt}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, prompt: e.target.value })}
                className="bg-white/70 dark:bg-gray-900/70 border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-4 min-h-[250px] text-sm leading-relaxed transition-all duration-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 resize-y"
                placeholder="在这里输入您的AI提示词内容...\n\n例如：\n- 角色设定\n- 任务要求\n- 输出格式\n- 注意事项"
              />
            </div>


          </div>

          {/* Footer */}
          <div className="p-8 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/50 to-white/30 dark:from-gray-900/50 dark:to-gray-800/30">
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditingTemplate(null);
                }}
                className="border-gray-200/60 dark:border-gray-700/60 px-6 py-2 rounded-2xl hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                取消
              </Button>
              <Button
                onClick={handleSaveTemplate}
                className="  px-4 py-2 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                保存模板
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden" ref={modalRef}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              AI 模板库
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">选择合适的模板开始创作</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateTemplate}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportTemplates}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportTemplates}
              className="hidden"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Template Grid */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <ScrollArea className="h-full">
            {/* 内置模板 */}
            {filteredTemplates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">内置模板</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTemplates.map((template, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 border-gray-200 dark:border-gray-700"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {template.title}
                              </CardTitle>
                              <CardDescription className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                                {template.description}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs">
                            内置
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 自定义模板 */}
            {filteredCustomTemplates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">自定义模板</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCustomTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 border-gray-200 dark:border-gray-700"
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1" onClick={() => handleTemplateSelect(template)}>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {template.title}
                              </CardTitle>
                              <CardDescription className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                                {template.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                              自定义
                            </Badge>
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTemplate(template);
                                }}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                title="编辑模板"
                              >
                                <Edit3 className="w-3 h-3 text-gray-500" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTemplate(template.id);
                                }}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                title="删除模板"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {filteredTemplates.length === 0 && filteredCustomTemplates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">没有找到匹配的模板</p>
                <Button
                  variant="outline"
                  onClick={handleCreateTemplate}
                  className="mt-4 border-gray-200/50 dark:border-gray-700/50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  创建新模板
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            💡 使用 AI 模板让您的创作更加高效 • 点击模板直接应用，点击编辑按钮管理自定义模板
          </p>
        </div>

        {/* Delete Confirmation Alert */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm mx-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">确认删除</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                您确定要删除这个自定义模板吗？此操作无法撤销。
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  size="sm"
                >
                  取消
                </Button>
                <Button
                  onClick={confirmDeleteTemplate}
                  variant="destructive"
                  size="sm"
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;