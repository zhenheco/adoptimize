'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardOverview, ApiResponse, TimePeriod } from '@/lib/api/types';

/**
 * 儀表板總覽 Hook 回傳型別
 */
interface UseDashboardOverviewReturn {
  data: DashboardOverview | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 取得儀表板總覽數據
 *
 * 使用 SWR 模式管理資料獲取狀態
 *
 * @param period - 時間週期 (today, 7d, 30d, custom)
 * @returns 儀表板數據、載入狀態、錯誤和重新獲取函數
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useDashboardOverview('7d');
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 * return <Dashboard data={data} />;
 * ```
 */
export function useDashboardOverview(
  period: TimePeriod = '7d'
): UseDashboardOverviewReturn {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/dashboard/overview?period=${period}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result: ApiResponse<DashboardOverview> = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
