'use client';

import { useState, useCallback } from 'react';
import type { SaveAudienceRequest, SaveAudienceResponse } from '@/lib/api/types';

/**
 * useCreateMetaAudience Hook 回傳型別
 */
interface UseCreateMetaAudienceReturn {
  createAudience: (
    suggestionId: string,
    request?: SaveAudienceRequest
  ) => Promise<SaveAudienceResponse>;
  isLoading: boolean;
  error: Error | null;
  result: SaveAudienceResponse | null;
}

/**
 * 建立 Meta 自訂受眾
 *
 * 需要 Professional 或以上訂閱方案
 *
 * @param userId - 用戶 ID
 *
 * @example
 * ```tsx
 * const { createAudience, isLoading, error, result } = useCreateMetaAudience(userId);
 *
 * const handleCreate = async () => {
 *   try {
 *     const response = await createAudience(suggestionId, {
 *       audience_name: '我的 AI 建議受眾',
 *     });
 *     console.log('受眾已建立:', response.meta_audience_id);
 *   } catch (err) {
 *     console.error('建立失敗:', err);
 *   }
 * };
 * ```
 */
export function useCreateMetaAudience(
  userId: string | undefined
): UseCreateMetaAudienceReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SaveAudienceResponse | null>(null);

  const createAudience = useCallback(
    async (
      suggestionId: string,
      request: SaveAudienceRequest = {}
    ): Promise<SaveAudienceResponse> => {
      if (!userId) {
        throw new Error('用戶未登入');
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/v1/suggestions/${suggestionId}/save-audience?user_id=${userId}`,
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
              errorData.error?.message || '升級至 Professional 方案以使用此功能'
            );
            (error as Error & { code?: string }).code = 'PERMISSION_DENIED';
            throw error;
          }

          throw new Error(errorData.error?.message || '建立受眾失敗');
        }

        const data: SaveAudienceResponse = await response.json();
        setResult(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('建立受眾失敗');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  return {
    createAudience,
    isLoading,
    error,
    result,
  };
}
