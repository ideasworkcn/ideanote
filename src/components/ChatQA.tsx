import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { Loader2 } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  refs?: Array<{ id: string; score: number }>; // 引用的片段id和分数
  id?: string;
};

export default function ChatQA() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);

  // 滚到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setError(null);
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: question, id: `user-${Date.now()}` }]);

    try {
      const api: any = (window as any).electronAPI;
      if (!api?.kb?.answer) {
        throw new Error('KB 接口不可用');
      }
      const ans = await api.kb.answer(question, 4);
      if (!ans?.success) {
        throw new Error(ans?.error || '检索失败');
      }

      const context = ans.context || '';
      const refs: Array<{ id: string; score: number }> = (ans.results || []).map((r: any) => ({ id: r.id, score: r.score }));

      // 组装QA提示（交给主进程的“qa”系统消息约束）
      const prompt = `【上下文】\n${context}\n\n【问题】\n${question}\n\n【回答格式规范】\n- 仅基于上下文回答；无法回答请直接说“根据上下文无法回答”。\n- 不要复述上下文或问题，不要重复任何句子或小节标题。\n- 使用规范 Markdown 输出：标题只出现一次；避免“### **标题**”的双重标记。\n- 列表：每项独立一行，避免同一项内词语重复。\n- 表格（如需）：使用 GFM 表格，包含表头与分隔线；各数据行与表头列数一致；不要在单元格中使用标题/粗体标记；不要把同一行拆分成多段。\n- 内容紧凑：去除冗余描述，避免镜像式重复，保持信息密度。\n\n【输出要求】\n- 先给一句总括，再按结构化小节展开；无额外前言。`;

      // 先插入一个空的 assistant 作为流式占位（使用唯一ID确保后续只更新当前回答）
      const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setMessages(prev => [...prev, { role: 'assistant', content: '', refs, id: assistantId }]);
      currentAssistantIdRef.current = assistantId;

      // 流式监听
      const onChunk = (_event: any, rawChunk: string) => {
        const chunk = String(rawChunk ?? '');
        setMessages(prev => {
          const next = [...prev];
          const targetIdx = next.findIndex((m) => m.id && m.id === currentAssistantIdRef.current);
          if (targetIdx >= 0) {
            const prevContent = next[targetIdx].content || '';
            let updated = prevContent;
            if (chunk) {
              // 如果后端发送的是“到目前为止的完整内容”，而不是增量delta，
              // 那么chunk通常会以prevContent为前缀或包含它，直接替换即可，避免重复。
              if (chunk.startsWith(prevContent) || (prevContent && chunk.includes(prevContent))) {
                updated = chunk;
              } else {
                updated = prevContent + chunk;
              }
            }
            if (updated !== prevContent) {
              next[targetIdx] = { ...next[targetIdx], content: updated };
            }
          }
          return next;
        });
      };
      const onComplete = () => {
        // 清理监听器
        api.removeListener('ai:streamChunk', onChunk);
        api.removeListener('ai:streamComplete', onComplete);
        api.removeListener('ai:streamError', onError);
        setSending(false);
      };
      const onError = (_event: any, err: string) => {
        api.removeListener('ai:streamChunk', onChunk);
        api.removeListener('ai:streamComplete', onComplete);
        api.removeListener('ai:streamError', onError);
        setSending(false);
        setError(String(err));
      };

      api.on('ai:streamChunk', onChunk);
      api.on('ai:streamComplete', onComplete);
      api.on('ai:streamError', onError);

      // 发起流式生成（qa 模式）
      const res = await api.ai.generateStream(prompt, 'qa');
      if (!res?.success) {
        throw new Error(res?.error || '生成失败');
      }
      setInput('');
    } catch (e: any) {
      setSending(false);
      setError(String(e));
    }
  };

  const TypingIndicator = () => (
    <div className="flex items-center gap-1" role="status" aria-label="正在生成">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0s' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
    </div>
  );

  return (
    <div className="flex flex-col h-[70vh] w-full">
      <div className="px-2 py-1 mb-2 text-xs text-gray-600 select-none">知识库对话 · 回答仅基于你本地工作区内容</div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-50/70 border border-gray-200 rounded-xl p-3 space-y-2"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">开始提问吧：我们会先检索工作区内容，再用你配置的大模型生成答案。</div>
        )}
        {messages.map((m, i) => (
            <div
            key={i}
            className={`rounded-2xl px-3 py-1.5 whitespace-pre-wrap shadow-sm ${
              m.role === 'user'
                ? 'max-w-[80%] bg-blue-50 border border-blue-200 self-end ml-auto'
                : 'w-full bg-white border border-gray-200'
            }`}
          >
            <div className="text-xs text-gray-500 mb-0.5">{m.role === 'user' ? '你' : '助手'}</div>
            <div className="text-sm text-gray-800 prose prose-sm dark:prose-invert leading-tight max-w-none break-words prose-p:my-1 prose-p:leading-snug prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-ul:pl-4 prose-ol:pl-4 prose-ul:space-y-0.5 prose-ol:space-y-0.5 prose-h1:text-base prose-h1:mt-2 prose-h1:mb-1 prose-h2:text-sm prose-h2:mt-2 prose-h2:mb-1 prose-h3:text-sm prose-h3:mt-1.5 prose-h3:mb-1 prose-blockquote:my-1.5 prose-hr:my-2 prose-table:my-1.5">
              {m.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a
                        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    img: ({ node, ...props }) => (
                      // 使图片响应式并带边框与圆角
                      <img className="max-w-full h-auto rounded border border-gray-200 my-1.5" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-2 pl-3 my-1.5 text-gray-700 bg-gray-50" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="border-t border-gray-200 my-2" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-outside pl-5 my-1" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-outside pl-5 my-1" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic text-gray-800 dark:text-gray-200" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full table-auto border-collapse my-1.5 border border-gray-200" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-gray-50" {...props} />
                    ),
                    tbody: ({ node, ...props }) => (
                      <tbody {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="border-b border-gray-200" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="text-xs font-medium text-gray-700 px-2 py-1 text-left border border-gray-200" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="text-xs text-gray-800 px-2 py-1 align-top border border-gray-200" {...props} />
                    ),
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
                        const cls = (className ? ` ${className}` : '');
                        return <code className={`px-1 py-0.5 rounded bg-gray-100 text-gray-800${cls}`}>{children}</code>;
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
                        <pre className="hljs text-[13px] leading-snug my-1">
                          <code dangerouslySetInnerHTML={{ __html: html }} />
                        </pre>
                      );
                    }
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                m.role === 'assistant' && sending ? <TypingIndicator /> : ''
              )}
            </div>
            {m.role === 'assistant' && m.refs && m.refs.length > 0 && (
              <div className="mt-2 text-[11px] text-gray-500">
                引用：{m.refs.slice(0, 3).map((r: { id: string; score: number }) => `${r.id}(${r.score.toFixed(2)})`).join('，')}
              </div>
            )}
            {m.role === 'assistant' && m.content && (
              <div className="mt-1 flex gap-1">
                <button
                  className="text-[11px] px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
                  title="复制回答"
                  onClick={() => {
                    try { navigator.clipboard.writeText(m.content); } catch {}
                  }}
                >复制</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的问题（自动基于知识库检索并生成回答）"
          className="flex-1"
          onKeyDown={(e) => {
            if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
              e.preventDefault();
              send();
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              setMessages([]);
              setError(null);
            }
          }}
          aria-label="问题输入"
        />
        <Button onClick={send} disabled={sending || !input.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
          {sending ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              生成中…
            </span>
          ) : (
            '发送'
          )}
        </Button>
        <Button variant="outline" onClick={() => { setMessages([]); setError(null); }}>
          清屏
        </Button>
      </div>
      {error && (
        <div className="text-xs text-red-600 mt-1" role="alert">{error}</div>
      )}
    </div>
  );
}