'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ActionHistoryItem } from '@/lib/utils/action-history';
import type { ApiResponse } from '@/lib/api/types';

/**
 * 歷史記錄篩選選項
 */
export interface ActionHistoryFilters {
  /** 操作類型篩選 */
  action_type?: string;
  /** 目標類型篩選 */
  target_type?: string;
  /** 搜尋關鍵字 */
  search?: string;
  /** 時間範圍（天數） */
  days?: number;
}

/**
 * useActionHistory Hook 回傳型別
 */
interface UseActionHistoryReturn {
  history: ActionHistoryItem[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
  revertAction: (historyItem: ActionHistoryItem) => Promise<void>;
}

/**
 * 取得操作歷史記錄
 *
 * 支援篩選與搜尋
 *
 * @param filters - 篩選選項
 *
 * @example
 * ```tsx
 * const { history, isLoading, revertAction } = useActionHistory({
 *   days: 30,
 *   action_type: 'PAUSE',
 * });
 * ```
 */
export function useActionHistory(
  filters: ActionHistoryFilters = { days: 30 }
): UseActionHistoryReturn {
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  // 穩定化 filters 依賴
  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const parsedFilters = JSON.parse(filtersKey) as ActionHistoryFilters;

      if (parsedFilters.action_type) {
        params.append('action_type', parsedFilters.action_type);
      }
      if (parsedFilters.target_type) {
        params.append('target_type', parsedFilters.target_type);
      }
      if (parsedFilters.search) {
        params.append('search', parsedFilters.search);
      }
      if (parsedFilters.days) {
        params.append('days', String(parsedFilters.days));
      }

      const response = await fetch(`/api/v1/history?${params}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result: ApiResponse<ActionHistoryItem[]> = await response.json();
      setHistory(result.data);
      setTotal(result.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  /**
   * 還原操作
   */
  const revertAction = useCallback(async (historyItem: ActionHistoryItem) => {
    try {
      const response = await fetch('/api/v1/history/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: historyItem.id }),
      });

      if (!response.ok) {
        throw new Error(`還原失敗: ${response.status}`);
      }

      // 更新本地狀態
      setHistory((prev) =>
        prev.map((h) =>
          h.id === historyItem.id
            ? { ...h, reverted: true, reverted_at: new Date().toISOString() }
            : h
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('還原失敗'));
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    history,
    isLoading,
    error,
    total,
    refetch: fetchData,
    revertAction,
  };
}
