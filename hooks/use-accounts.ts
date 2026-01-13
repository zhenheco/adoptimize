'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AdAccount, Platform, ApiResponse } from '@/lib/api/types';

/**
 * 帳戶篩選選項
 */
export interface AccountFilters {
  /** 平台篩選 */
  platform?: Platform;
  /** 狀態篩選 */
  status?: 'active' | 'paused' | 'removed';
}

/**
 * 同步結果
 */
export interface SyncResult {
  success: boolean;
  account_id: string;
  message: string;
  task_id?: string;
}

/**
 * useAccounts Hook 回傳型別
 */
interface UseAccountsReturn {
  accounts: AdAccount[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refetch: () => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
  syncAccount: (accountId: string) => Promise<SyncResult>;
}

/**
 * 取得廣告帳戶列表
 *
 * @param filters - 篩選選項
 *
 * @example
 * ```tsx
 * const { accounts, syncAccount, disconnectAccount } = useAccounts({
 *   platform: 'google',
 * });
 * ```
 */
export function useAccounts(
  filters: AccountFilters = {}
): UseAccountsReturn {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
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
      const parsedFilters = JSON.parse(filtersKey) as AccountFilters;

      if (parsedFilters.platform) {
        params.append('platform', parsedFilters.platform);
      }
      if (parsedFilters.status) {
        params.append('status', parsedFilters.status);
      }

      const response = await fetch(`/api/v1/accounts?${params}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result: ApiResponse<AdAccount[]> = await response.json();
      setAccounts(result.data);
      setTotal(result.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  /**
   * 斷開帳戶連接
   */
  const disconnectAccount = useCallback(async (accountId: string) => {
    try {
      const response = await fetch(`/api/v1/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`斷開連接失敗: ${response.status}`);
      }

      // 更新本地狀態（移除或標記為已移除）
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId ? { ...a, status: 'removed' as const } : a
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('斷開連接失敗'));
      throw err;
    }
  }, []);

  /**
   * 觸發帳戶同步
   */
  const syncAccount = useCallback(async (accountId: string): Promise<SyncResult> => {
    try {
      const response = await fetch(`/api/v1/accounts/${accountId}/sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`同步失敗: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('同步失敗'));
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    accounts,
    isLoading,
    error,
    total,
    refetch: fetchData,
    disconnectAccount,
    syncAccount,
  };
}
