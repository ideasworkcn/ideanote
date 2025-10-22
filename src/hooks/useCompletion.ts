// hooks/useCompletion.ts
import { useState, useCallback, useRef, useMemo } from 'react';

interface UseCompletionOptions {
  api?: string;
  id?: string;
  onResponse?: (response: string) => void;
  onError?: (error: Error) => void;
  onFinish?: (completion: string) => void;
  onStart?: (prompt: string) => void;
  onSuccess?: (completion: string) => void;
}

interface CompletionOptions {
  body?: any;
}

export function useCompletion({
  api = '/api/completion',
  onError,
  onFinish,
  onResponse,
  onStart,
  onSuccess,
}: UseCompletionOptions = {}) {
  const [completion, setCompletion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 添加防抖机制
  const lastRequestTime = useRef<number>(0);
  const requestQueue = useRef<string[]>([]);
  const processingQueue = useRef<boolean>(false);

  // 优化的完成函数 - 添加防抖和队列管理
  const complete = useCallback(async (prompt: string, options?: CompletionOptions) => {
    // 防抖：如果请求太频繁，加入队列
    const now = Date.now();
    if (now - lastRequestTime.current < 300) {
      requestQueue.current.push(prompt);
      console.log('请求太频繁，加入队列:', prompt.substring(0, 50));
      return;
    }
    
    lastRequestTime.current = now;

    try {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);
      setCompletion('');

      if (onStart) {
        onStart(prompt);
      }

      // 检查是否在 Electron 环境中
      const isElectron = window.electronAPI !== undefined;

      if (isElectron && window.electronAPI?.ai?.generateStream) {
        // 使用 Electron IPC API
        console.log('使用 Electron IPC API 进行流式处理');
        
        let fullResponse = '';
        
        // 设置流式数据处理
        const handleStreamChunk = (_event: any, chunk: string) => {
          fullResponse += chunk;
          setCompletion(fullResponse);
          
          if (onResponse) {
            onResponse(fullResponse);
          }
        };

        const handleStreamComplete = () => {
          setCompletion(fullResponse);
          
          if (onSuccess) {
            onSuccess(fullResponse);
          }
          
          if (onFinish) {
            onFinish(fullResponse);
          }
          cleanup();
        };

        const handleStreamError = (_event: any, errorMessage: string) => {
          const error = new Error(errorMessage);
          setError(error);
          setIsLoading(false);
          
          if (onError) {
            onError(error);
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

        try {
          // 启动流式生成
          const { option, command } = options?.body || {};
          await window.electronAPI.ai.generateStream(prompt, option || 'generate', command);
          
          // 30秒后自动清理监听器（备用清理机制）
          setTimeout(cleanup, 30000);
        } catch (err) {
          cleanup();
          throw err;
        }

      } else {
        // 使用 HTTP 请求
        console.log('使用 HTTP API 进行流式处理');
        
        const response = await fetch(api, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            ...options,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (onResponse) {
          onResponse('');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;
            setCompletion(fullResponse);
            
            if (onResponse) {
              onResponse(fullResponse);
            }
          }
        }

        setCompletion(fullResponse);
        
        if (onSuccess) {
          onSuccess(fullResponse);
        }
        
        if (onFinish) {
          onFinish(fullResponse);
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('请求被取消');
        return;
      }

      console.error('完成请求失败:', err);
      setError(err as Error);
      
      if (onError) {
        onError(err as Error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      
      // 处理队列中的下一个请求
      if (requestQueue.current.length > 0) {
        const nextPrompt = requestQueue.current.shift();
        if (nextPrompt) {
          setTimeout(() => {
            complete(nextPrompt, options);
          }, 100);
        }
      }
    }
  }, [api, onStart, onResponse, onSuccess, onError, onFinish]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setCompletion('');
    setError(null);
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    requestQueue.current = [];
  }, []);

  return useMemo(() => ({
    complete,
    completion,
    isLoading,
    error,
    stop,
    reset,
  }), [complete, completion, isLoading, error, stop, reset]);
}