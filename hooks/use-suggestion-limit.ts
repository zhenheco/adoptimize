'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SuggestionLimit } from '@/lib/api/types';

/**
 * useSuggestionLimit Hook 回傳型別
 */
interface UseSuggestionLimitReturn {
  limit: SuggestionLimit | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 檢查智慧建議使用限制
 *
 * @param userId - 用戶 ID
 *
 * @example
 * ```tsx
 * const { limit, isLoading } = useSuggestionLimit(userId);
 *
 * if (limit && !limit.can_generate) {
 *   console.log(limit.message);  // 顯示限制訊息
 * }
 * ```
 */
export function useSuggestionLimit(userId: string | undefined): UseSuggestionLimitReturn {
  const [limit, setLimit] = useState<SuggestionLimit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/suggestions/limit?user_id=${userId}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const data: SuggestionLimit = await response.json();
      setLimit(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('檢查限制失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    limit,
    isLoading,
    error,
    refetch: fetchData,
  };
}
