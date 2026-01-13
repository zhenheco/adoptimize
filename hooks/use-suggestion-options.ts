'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SuggestionOptionsResponse } from '@/lib/api/types';

/**
 * useSuggestionOptions Hook 回傳型別
 */
interface UseSuggestionOptionsReturn {
  options: SuggestionOptionsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 取得智慧建議的產業和廣告目標選項
 *
 * @example
 * ```tsx
 * const { options, isLoading } = useSuggestionOptions();
 *
 * if (options) {
 *   console.log(options.industries);  // 產業選項
 *   console.log(options.objectives);  // 廣告目標選項
 * }
 * ```
 */
export function useSuggestionOptions(): UseSuggestionOptionsReturn {
  const [options, setOptions] = useState<SuggestionOptionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/suggestions/options');

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const data: SuggestionOptionsResponse = await response.json();
      setOptions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('取得選項失敗'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    options,
    isLoading,
    error,
    refetch: fetchData,
  };
}
