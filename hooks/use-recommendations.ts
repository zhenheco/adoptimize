'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Recommendation, ApiResponse } from '@/lib/api/types';
import { calculateSnoozeUntil, type SnoozeDuration } from '@/lib/utils/snooze-utils';

/**
 * 建議篩選選項
 */
export interface RecommendationFilters {
  /** 狀態篩選 */
  status?: 'pending' | 'executed' | 'ignored' | 'snoozed' | 'all';
}

/**
 * 批次操作進度
 */
export interface BatchProgress {
  current: number;
  total: number;
}

/**
 * 批次操作回調
 */
export type BatchProgressCallback = (progress: BatchProgress) => void;

/**
 * useRecommendations Hook 回傳型別
 */
interface UseRecommendationsReturn {
  recommendations: Recommendation[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
  executeRecommendation: (recommendation: Recommendation) => Promise<void>;
  ignoreRecommendation: (recommendation: Recommendation) => Promise<void>;
  snoozeRecommendation: (
    recommendation: Recommendation,
    duration: SnoozeDuration
  ) => Promise<void>;
  batchExecute: (
    recommendations: Recommendation[],
    onProgress?: BatchProgressCallback
  ) => Promise<{ success: number; failed: number }>;
  batchIgnore: (
    recommendations: Recommendation[],
    onProgress?: BatchProgressCallback
  ) => Promise<{ success: number; failed: number }>;
}

/**
 * 取得建議列表
 *
 * 支援篩選與排序
 *
 * @param filters - 篩選選項
 *
 * @example
 * ```tsx
 * const { recommendations, isLoading, executeRecommendation, ignoreRecommendation } = useRecommendations({
 *   status: 'pending',
 * });
 * ```
 */
export function useRecommendations(
  filters: RecommendationFilters = { status: 'pending' }
): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  // 穩定化 filters 依賴，避免重複渲染
  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // 從穩定化的 key 解析 filters
      const parsedFilters = JSON.parse(filtersKey) as RecommendationFilters;

      if (parsedFilters.status && parsedFilters.status !== 'all') {
        params.append('status', parsedFilters.status);
      }

      const response = await fetch(`/api/v1/recommendations?${params}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result: ApiResponse<Recommendation[]> = await response.json();
      setRecommendations(result.data);
      setTotal(result.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  /**
   * 執行建議
   */
  const executeRecommendation = useCallback(async (recommendation: Recommendation) => {
    try {
      const response = await fetch(`/api/v1/recommendations/${recommendation.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`執行失敗: ${response.status}`);
      }

      // 更新本地狀態
      setRecommendations((prev) =>
        prev.map((r) =>
          r.id === recommendation.id ? { ...r, status: 'executed' as const } : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('執行失敗'));
      throw err;
    }
  }, []);

  /**
   * 忽略建議
   */
  const ignoreRecommendation = useCallback(async (recommendation: Recommendation) => {
    try {
      const response = await fetch(`/api/v1/recommendations/${recommendation.id}/ignore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`忽略失敗: ${response.status}`);
      }

      // 更新本地狀態
      setRecommendations((prev) =>
        prev.map((r) =>
          r.id === recommendation.id ? { ...r, status: 'ignored' as const } : r
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('忽略失敗'));
      throw err;
    }
  }, []);

  /**
   * 延後處理建議
   */
  const snoozeRecommendation = useCallback(
    async (recommendation: Recommendation, duration: SnoozeDuration) => {
      try {
        const snoozeUntil = calculateSnoozeUntil(duration);

        const response = await fetch(`/api/v1/recommendations/${recommendation.id}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snooze_until: snoozeUntil }),
        });

        if (!response.ok) {
          throw new Error(`延後失敗: ${response.status}`);
        }

        // 更新本地狀態
        setRecommendations((prev) =>
          prev.map((r) =>
            r.id === recommendation.id
              ? { ...r, status: 'snoozed' as const, snooze_until: snoozeUntil }
              : r
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error('延後失敗'));
        throw err;
      }
    },
    []
  );

  /**
   * 批次執行建議
   * 依序執行多個建議，並回報進度
   */
  const batchExecute = useCallback(
    async (
      items: Recommendation[],
      onProgress?: BatchProgressCallback
    ): Promise<{ success: number; failed: number }> => {
      let success = 0;
      let failed = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        onProgress?.({ current: i + 1, total: items.length });

        try {
          const response = await fetch(
            `/api/v1/recommendations/${item.id}/execute`,
            { method: 'POST' }
          );

          if (response.ok) {
            success++;
            // 更新本地狀態
            setRecommendations((prev) =>
              prev.map((r) =>
                r.id === item.id ? { ...r, status: 'executed' as const } : r
              )
            );
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      return { success, failed };
    },
    []
  );

  /**
   * 批次忽略建議
   * 依序忽略多個建議，並回報進度
   */
  const batchIgnore = useCallback(
    async (
      items: Recommendation[],
      onProgress?: BatchProgressCallback
    ): Promise<{ success: number; failed: number }> => {
      let success = 0;
      let failed = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        onProgress?.({ current: i + 1, total: items.length });

        try {
          const response = await fetch(
            `/api/v1/recommendations/${item.id}/ignore`,
            { method: 'POST' }
          );

          if (response.ok) {
            success++;
            // 更新本地狀態
            setRecommendations((prev) =>
              prev.map((r) =>
                r.id === item.id ? { ...r, status: 'ignored' as const } : r
              )
            );
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      return { success, failed };
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    recommendations,
    isLoading,
    error,
    total,
    refetch: fetchData,
    executeRecommendation,
    ignoreRecommendation,
    snoozeRecommendation,
    batchExecute,
    batchIgnore,
  };
}
