'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Creative, ApiResponse, FatigueStatus } from '@/lib/api/types';

/**
 * 素材篩選選項
 */
export interface CreativeFilters {
  /** 素材類型 */
  type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'all';
  /** 疲勞狀態 */
  fatigueStatus?: FatigueStatus | 'all';
  /** 素材狀態 */
  status?: 'active' | 'paused' | 'all';
  /** 排序方式 */
  sortBy?: 'fatigue' | 'ctr' | 'spend' | 'conversions';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 素材分頁資訊
 */
export interface CreativePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * useCreatives Hook 回傳型別
 */
interface UseCreativesReturn {
  creatives: Creative[];
  isLoading: boolean;
  error: Error | null;
  pagination: CreativePagination;
  refetch: () => Promise<void>;
  toggleStatus: (creative: Creative) => Promise<void>;
}

/**
 * 取得素材列表
 *
 * 支援篩選、排序和分頁
 *
 * @param filters - 篩選選項
 * @param page - 頁碼
 * @param pageSize - 每頁筆數
 *
 * @example
 * ```tsx
 * const { creatives, isLoading, pagination, toggleStatus } = useCreatives({
 *   fatigueStatus: 'warning',
 *   sortBy: 'fatigue',
 *   sortOrder: 'desc',
 * });
 * ```
 */
export function useCreatives(
  filters: CreativeFilters = {},
  page = 1,
  pageSize = 12
): UseCreativesReturn {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<CreativePagination>({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
  });

  // 穩定化 filters 依賴，避免重複渲染
  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      // 從穩定化的 key 解析 filters
      const parsedFilters = JSON.parse(filtersKey) as CreativeFilters;

      if (parsedFilters.type && parsedFilters.type !== 'all') {
        params.append('type', parsedFilters.type);
      }
      if (parsedFilters.fatigueStatus && parsedFilters.fatigueStatus !== 'all') {
        params.append('fatigue_status', parsedFilters.fatigueStatus);
      }
      if (parsedFilters.status && parsedFilters.status !== 'all') {
        params.append('status', parsedFilters.status);
      }
      if (parsedFilters.sortBy) {
        params.append('sort_by', parsedFilters.sortBy);
      }
      if (parsedFilters.sortOrder) {
        params.append('sort_order', parsedFilters.sortOrder);
      }

      const response = await fetch(`/api/v1/creatives?${params}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result: ApiResponse<Creative[]> = await response.json();
      setCreatives(result.data);
      setPagination({
        page: result.meta?.page || 1,
        pageSize,
        total: result.meta?.total || 0,
        totalPages: Math.ceil((result.meta?.total || 0) / pageSize),
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey, page, pageSize]);

  /**
   * 切換素材狀態（暫停/啟用）
   */
  const toggleStatus = useCallback(async (creative: Creative) => {
    try {
      const newStatus = creative.status === 'active' ? 'paused' : 'active';
      const action = newStatus === 'paused' ? 'pause' : 'enable';

      const response = await fetch(`/api/v1/creatives/${creative.id}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`操作失敗: ${response.status}`);
      }

      // 更新本地狀態
      setCreatives((prev) =>
        prev.map((c) =>
          c.id === creative.id ? { ...c, status: newStatus } : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('操作失敗'));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    creatives,
    isLoading,
    error,
    pagination,
    refetch: fetchData,
    toggleStatus,
  };
}
