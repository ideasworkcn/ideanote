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
      const response = await fetch(options.api || '/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ prompt: prompt,...completeOptions?.body} ),
      });

      if (options.onResponse) {
        options.onResponse(response);
      }

      // 处理 429 状态码
      if (response.status === 429) {
        const limitInfo = await response.json();
        if (options.onLimitReached) {
          options.onLimitReached(limitInfo);
        }
        return;
      }

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let result = '';
        
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setCompletion(result);
        }
      }
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