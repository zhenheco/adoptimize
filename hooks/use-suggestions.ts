'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AudienceSuggestion,
  ApiResponse,
  GenerateSuggestionRequest,
  SuggestionStatus,
} from '@/lib/api/types';

/**
 * 建議篩選選項
 */
export interface SuggestionFilters {
  /** 帳戶 ID */
  accountId?: string;
  /** 狀態篩選 */
  status?: SuggestionStatus | 'all';
}

/**
 * useSuggestions Hook 回傳型別
 */
interface UseSuggestionsReturn {
  suggestions: AudienceSuggestion[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
  generateSuggestion: (
    request: GenerateSuggestionRequest,
    useMock?: boolean
  ) => Promise<AudienceSuggestion>;
}

/**
 * 智慧受眾建議 Hook
 *
 * 提供建議列表查詢和生成功能
 *
 * @param userId - 用戶 ID
 * @param filters - 篩選選項
 *
 * @example
 * ```tsx
 * const { suggestions, isLoading, generateSuggestion } = useSuggestions(userId, {
 *   accountId: selectedAccountId,
 * });
 *
 * // 生成新建議
 * const newSuggestion = await generateSuggestion({
 *   account_id: selectedAccountId,
 *   industry_code: 'ECOMMERCE',
 *   objective_code: 'CONVERSION',
 * });
 * ```
 */
export function useSuggestions(
  userId: string | undefined,
  filters: SuggestionFilters = {}
): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<AudienceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  // 穩定化 filters 依賴
  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('user_id', userId);

      // 從穩定化的 key 解析 filters
      const parsedFilters = JSON.parse(filtersKey) as SuggestionFilters;

      if (parsedFilters.accountId) {
        params.append('account_id', parsedFilters.accountId);
      }
      if (parsedFilters.status && parsedFilters.status !== 'all') {
        params.append('status', parsedFilters.status);
      }

      const response = await fetch(`/api/v1/suggestions?${params}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result: ApiResponse<AudienceSuggestion[]> = await response.json();
      setSuggestions(result.data);
      setTotal(result.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('取得建議失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, filtersKey]);

  /**
   * 生成新建議
   */
  const generateSuggestion = useCallback(
    async (
      request: GenerateSuggestionRequest,
      useMock: boolean = false
    ): Promise<AudienceSuggestion> => {
      if (!userId) {
        throw new Error('用戶未登入');
      }

      const params = new URLSearchParams();
      params.append('user_id', userId);
      if (useMock) {
        params.append('use_mock', 'true');
      }

      const response = await fetch(`/api/v1/suggestions?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 處理超過使用限制
        if (response.status === 429) {
          const error = new Error(
            errorData.error?.message || '本月建議生成次數已達上限'
          );
          (error as Error & { code?: string }).code = 'RATE_LIMIT_EXCEEDED';
          throw error;
        }

        throw new Error(errorData.error?.message || '生成建議失敗');
      }

      const newSuggestion: AudienceSuggestion = await response.json();

      // 將新建議加入列表開頭
      setSuggestions((prev) => [newSuggestion, ...prev]);
      setTotal((prev) => prev + 1);

      return newSuggestion;
    },
    [userId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    suggestions,
    isLoading,
    error,
    total,
    refetch: fetchData,
    generateSuggestion,
  };
}
