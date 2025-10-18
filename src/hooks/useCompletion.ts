// hooks/useCompletion.ts
import { useState, useCallback, useRef } from 'react';

interface UseCompletionOptions {
  api?: string;
  id?: string;
  onResponse?: (response: Response) => void;
  onError?: (error: Error) => void;
  onFinish?: (completion: string) => void;
  onStart?: () => void;
}

interface CompleteOptions {
  body?: any;
}

export function useCompletion(options: UseCompletionOptions = {}) {
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const complete = useCallback(async (prompt: string, completeOptions?: CompleteOptions) => {
    // 如果有正在进行的请求，先取消它
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setCompletion(''); // 清空之前的内容

    // 调用开始回调
    if (options.onStart) {
      options.onStart();
    }

    try {
      // 检查是否在Electron环境中
      if (window.electronAPI) {
        // 使用Electron IPC流式API
        const { option, command } = completeOptions?.body || {};
        
        // 使用ref来跟踪最新的completion内容
        let currentCompletion = '';
        
        // 设置流式数据处理
        const handleStreamChunk = (_event: any, chunk: string) => {
          // 添加日志来查看接收到的数据
          // console.log('📥 useCompletion接收chunk:', JSON.stringify(chunk));
          // console.log('📥 当前累积长度:', currentCompletion.length);
          
          currentCompletion += chunk;
          // console.log('📥 累积后总长度:', currentCompletion.length);
          // console.log('📥 完整累积内容:', currentCompletion.replace(/\n/g, '\\n'));
          // console.log('📥 Markdown符号检查:', {
          //   hasH3: currentCompletion.includes('###'),
          //   hasH4: currentCompletion.includes('####'),
          //   hasBold: currentCompletion.includes('**'),
          //   hasNewlines: currentCompletion.includes('\n'),
          //   hasDashes: currentCompletion.includes('-')
          // });
          // console.log('---');
          
          setCompletion(currentCompletion);
        };

        const handleStreamComplete = () => {
          setIsLoading(false);
          if (options.onFinish) {
            options.onFinish(currentCompletion);
          }
          cleanup();
        };

        const handleStreamError = (_event: any, errorMessage: string) => {
          const error = new Error(errorMessage);
          setError(error);
          setIsLoading(false);
          
          if (options.onError) {
            options.onError(error);
          }
          cleanup();
        };

        // 清理监听器函数
        const cleanup = () => {
          window.electronAPI.removeListener('ai:streamChunk', handleStreamChunk);
          window.electronAPI.removeListener('ai:streamComplete', handleStreamComplete);
          window.electronAPI.removeListener('ai:streamError', handleStreamError);
        };

        // 注册临时监听器
        window.electronAPI.on('ai:streamChunk', handleStreamChunk);
        window.electronAPI.on('ai:streamComplete', handleStreamComplete);
        window.electronAPI.on('ai:streamError', handleStreamError);

        // 启动流式生成
        await window.electronAPI.ai.generateStream(prompt, option || 'generate', command);

        // 30秒后自动清理监听器（备用清理机制）
        setTimeout(cleanup, 30000);

      } else {
        setIsLoading(false);
      }

    } catch (err) {
      // 检查是否是用户取消的请求
      if (err instanceof Error && err.name === 'AbortError') {
        return; // 静默处理取消的请求
      }

      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      setIsLoading(false);
      
      if (options.onError) {
        options.onError(error);
      }
    }
  }, [options]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    completion,
    isLoading,
    error,
    complete,
    stop,
  };
}