'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';

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
      const response = await api.post<CopywritingResult>('/ai/copywriting', {
        product_description: productDescription,
        style,
      });
      setResult(response);
      return response;
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
