// hooks/useCompletion.ts
import { useState, useCallback } from 'react';

interface UseCompletionOptions {
  api?: string;
  id?: string;
  onResponse?: (response: Response) => void;
  onError?: (error: Error) => void;
  onLimitReached?: (limitInfo: any) => void; // 新增限制回调
}

interface CompleteOptions {
  body?: any;
}

export function useCompletion(options: UseCompletionOptions = {}) {
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const complete = useCallback(async (prompt: string, completeOptions?: CompleteOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用 Electron API 而不是 fetch
      const { option, command } = completeOptions?.body || {};
      const result = await window.electronAPI.ai.generate(prompt, option || 'generate', command);

      if (!result.success) {
        throw new Error(result.error || 'AI generation failed');
      }

      // 直接设置完成的内容（非流式）
      setCompletion(result.content || '');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return {
    completion,
    isLoading,
    error,
    complete,
  };
}