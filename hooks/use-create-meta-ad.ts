'use client';

import { useState, useCallback } from 'react';
import type { CreateAdRequest, CreateAdResponse } from '@/lib/api/types';

/**
 * useCreateMetaAd Hook 回傳型別
 */
interface UseCreateMetaAdReturn {
  createAd: (suggestionId: string, request: CreateAdRequest) => Promise<CreateAdResponse>;
  isLoading: boolean;
  error: Error | null;
  result: CreateAdResponse | null;
}

/**
 * 建立 Meta 廣告（Ad Set + Ad）
 *
 * 需要 Agency 或以上訂閱方案
 *
 * @param userId - 用戶 ID
 *
 * @example
 * ```tsx
 * const { createAd, isLoading, error, result } = useCreateMetaAd(userId);
 *
 * const handleCreate = async () => {
 *   try {
 *     const response = await createAd(suggestionId, {
 *       campaign_id: selectedCampaignId,
 *       daily_budget: 500,
 *       use_suggested_copy: true,
 *     });
 *     console.log('廣告已建立:', response.meta_ad_id);
 *   } catch (err) {
 *     console.error('建立失敗:', err);
 *   }
 * };
 * ```
 */
export function useCreateMetaAd(userId: string | undefined): UseCreateMetaAdReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<CreateAdResponse | null>(null);

  const createAd = useCallback(
    async (suggestionId: string, request: CreateAdRequest): Promise<CreateAdResponse> => {
      if (!userId) {
        throw new Error('用戶未登入');
      }

      // 驗證必填欄位
      if (!request.campaign_id || !request.daily_budget) {
        throw new Error('campaign_id 和 daily_budget 為必填');
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/v1/suggestions/${suggestionId}/create-ad?user_id=${userId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // 處理權限不足
          if (response.status === 403) {
            const error = new Error(
              errorData.error?.message || '升級至 Agency 方案以使用此功能'
            );
            (error as Error & { code?: string }).code = 'PERMISSION_DENIED';
            throw error;
          }

          throw new Error(errorData.error?.message || '建立廣告失敗');
        }

        const data: CreateAdResponse = await response.json();
        setResult(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('建立廣告失敗');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  return {
    createAd,
    isLoading,
    error,
    result,
  };
}
