'use client';

import { useState } from 'react';

interface CopywritingResult {
  headlines: string[];
  descriptions: string[];
}

export function useAICopywriting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<CopywritingResult | null>(null);

  const generate = async (productDescription: string, style = 'professional') => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用相對路徑呼叫 Next.js API 路由（代理到後端）
      const res = await fetch('/api/v1/ai/copywriting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_description: productDescription,
          style,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || '生成失敗');
      }

      setResult(data);
      return data as CopywritingResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('生成失敗');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generate,
    result,
    isLoading,
    error,
    reset: () => {
      setResult(null);
      setError(null);
    },
  };
}
