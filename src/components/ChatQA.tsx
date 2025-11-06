import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  refs?: Array<{ id: string; score: number }>; // 引用的片段id和分数
};

export default function ChatQA() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    setMessages(prev => [...prev, { role: 'user', content: question }]);

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
      const prompt = `【上下文】\n${context}\n\n【问题】\n${question}\n\n【要求】请仅基于上下文回答，如无答案请明确说明。`;

      // 先插入一个空的 assistant 作为流式占位
      const assistantIndex = messages.length + 1; // 新增后的位置
      setMessages(prev => [...prev, { role: 'assistant', content: '', refs }]);

      // 流式监听
      const onChunk = (_event: any, chunk: string) => {
        setMessages(prev => {
          const next = [...prev];
          const lastIdx = next.findIndex((m, idx) => idx === assistantIndex);
          if (lastIdx >= 0) {
            next[lastIdx] = { ...next[lastIdx], content: (next[lastIdx].content || '') + chunk };
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

  return (
    <div className="flex flex-col h-[70vh] w-full">
      <div className="px-2 py-1 mb-2 text-xs text-gray-600 select-none">知识库对话 · 回答仅基于你本地工作区内容</div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-50/70 border border-gray-200 rounded-xl p-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">开始提问吧：我们会先检索工作区内容，再用你配置的大模型生成答案。</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-2xl px-3 py-2 whitespace-pre-wrap shadow-sm ${m.role === 'user' ? 'bg-blue-50 border border-blue-200 self-end ml-auto' : 'bg-white border border-gray-200'} `}>
            <div className="text-xs text-gray-500 mb-1">{m.role === 'user' ? '你' : '助手'}</div>
            <div className="text-sm text-gray-800 prose prose-sm max-w-none">
              {m.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
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
                        return <code className={className}>{children}</code>;
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
                        <pre className="hljs">
                          <code dangerouslySetInnerHTML={{ __html: html }} />
                        </pre>
                      );
                    }
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : (
                m.role === 'assistant' && sending ? <span className="text-gray-500">生成中…</span> : ''
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
          {sending ? '生成中…' : '发送'}
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