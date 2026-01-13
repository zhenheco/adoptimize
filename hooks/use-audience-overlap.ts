'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Audience } from '@/lib/api/types';
import type { AudienceBase, AudienceOverlapPair } from '@/lib/utils/audience-overlap';

/**
 * 受眾重疊資料 Hook
 *
 * 管理受眾重疊分析的數據獲取與狀態
 * 注意：實際重疊數據需要從 API 獲取（例如 Meta Marketing API 的 reach estimate）
 * 這裡使用模擬數據作為示範
 */
export function useAudienceOverlap(audiences: Audience[]) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [overlapData, setOverlapData] = useState<Record<string, number>>({});

  // 將 Audience 轉換為 AudienceBase（只包含重疊分析需要的欄位）
  const audienceBaseList: AudienceBase[] = useMemo(() => {
    return audiences.map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
    }));
  }, [audiences]);

  // 模擬獲取重疊數據
  // 實際應用中，這會呼叫 Meta/Google API 來獲取受眾重疊資訊
  const fetchOverlapData = useCallback(async () => {
    if (audiences.length < 2) {
      setOverlapData({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 模擬 API 延遲
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 產生模擬的重疊數據
      // 實際應用中，這會是：
      // const response = await fetch('/api/v1/audiences/overlap');
      // const data = await response.json();
      const mockOverlapData: Record<string, number> = {};

      for (let i = 0; i < audiences.length; i++) {
        for (let j = i + 1; j < audiences.length; j++) {
          const a1 = audiences[i];
          const a2 = audiences[j];
          const minSize = Math.min(a1.size, a2.size);

          // 產生隨機重疊率（0-60%）
          // 相同來源的受眾重疊率較高
          let overlapRate: number;
          if (a1.source === a2.source) {
            overlapRate = 0.3 + Math.random() * 0.3; // 30-60%
          } else if (a1.type === a2.type) {
            overlapRate = 0.15 + Math.random() * 0.25; // 15-40%
          } else {
            overlapRate = Math.random() * 0.25; // 0-25%
          }

          const overlapCount = Math.floor(minSize * overlapRate);

          // 雙向記錄（對稱）
          mockOverlapData[`${a1.id}-${a2.id}`] = overlapCount;
          mockOverlapData[`${a2.id}-${a1.id}`] = overlapCount;
        }
      }

      setOverlapData(mockOverlapData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch overlap data'));
    } finally {
      setIsLoading(false);
    }
  }, [audiences]);

  return {
    audienceBaseList,
    overlapData,
    isLoading,
    error,
    fetchOverlapData,
  };
}
