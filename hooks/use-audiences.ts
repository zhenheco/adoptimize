'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Audience, ApiResponse } from '@/lib/api/types';

/**
 * 受眾篩選選項
 */
export interface AudienceFilters {
  /** 受眾類型 */
  type?: 'CUSTOM' | 'LOOKALIKE' | 'SAVED' | 'all';
  /** 排序方式 */
  sortBy?: 'health_score' | 'cpa' | 'roas' | 'size' | 'conversions' | 'spend';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 受眾分頁資訊
 */
export interface AudiencePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * useAudiences Hook 回傳型別
 */
interface UseAudiencesReturn {
  audiences: Audience[];
  isLoading: boolean;
  error: Error | null;
  pagination: AudiencePagination;
  refetch: () => Promise<void>;
}

/**
 * 取得受眾列表
 *
 * 支援篩選、排序和分頁
 *
 * @param filters - 篩選選項
 * @param page - 頁碼
 * @param pageSize - 每頁筆數
 *
 * @example
 * ```tsx
 * const { audiences, isLoading, pagination } = useAudiences({
 *   sortBy: 'cpa',
 *   sortOrder: 'asc',
 * });
 * ```
 */
export function useAudiences(
  filters: AudienceFilters = {},
  page = 1,
  pageSize = 10
): UseAudiencesReturn {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<AudiencePagination>({
    page: 1,
    pageSize: 10,
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
      const parsedFilters = JSON.parse(filtersKey) as AudienceFilters;

      if (parsedFilters.type && parsedFilters.type !== 'all') {
        params.append('type', parsedFilters.type);
      }
      if (parsedFilters.sortBy) {
        params.append('sort_by', parsedFilters.sortBy);
      }
      if (parsedFilters.sortOrder) {
        params.append('sort_order', parsedFilters.sortOrder);
      }

      const response = await fetch(`/api/v1/audiences?${params}`);

      if (!response.ok) {
        // 嘗試解析錯誤訊息
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || errorData?.detail || `API 請求失敗: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result: ApiResponse<Audience[]> = await response.json();

      // 確保 data 是陣列
      if (!Array.isArray(result.data)) {
        throw new Error('API 返回的資料格式不正確');
      }

      setAudiences(result.data);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    audiences,
    isLoading,
    error,
    pagination,
    refetch: fetchData,
  };
}
