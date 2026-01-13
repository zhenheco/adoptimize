import { useState, useEffect, useMemo } from 'react';
import type { TimePeriod } from '@/lib/api/types';
import type { PeriodComparisonData } from '@/lib/utils/period-comparison';

/**
 * 計算期間範圍
 * @param period - 期間類型
 * @returns 當期和前期的開始/結束日期
 */
function calculatePeriodRanges(period: TimePeriod): {
  currentPeriod: { start: string; end: string };
  previousPeriod: { start: string; end: string };
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case 'today':
      currentStart = today;
      currentEnd = today;
      previousStart = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      previousEnd = previousStart;
      break;
    case '7d':
      currentEnd = today;
      currentStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      previousStart = new Date(previousEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      currentEnd = today;
      currentStart = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      previousStart = new Date(previousEnd.getTime() - 29 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
    default:
      // 預設為 7 天
      currentEnd = today;
      currentStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      previousStart = new Date(previousEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
  }

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return {
    currentPeriod: {
      start: formatDate(currentStart),
      end: formatDate(currentEnd),
    },
    previousPeriod: {
      start: formatDate(previousStart),
      end: formatDate(previousEnd),
    },
  };
}

/**
 * 產生模擬比較數據
 *
 * 在真實環境中，這應該從 API 獲取
 * 目前使用模擬數據進行開發
 */
function generateMockComparisonData(period: TimePeriod): PeriodComparisonData {
  const { currentPeriod, previousPeriod } = calculatePeriodRanges(period);

  // 模擬數據 - 當期數據
  const current = {
    spend: 15234.56,
    impressions: 523400,
    clicks: 12850,
    conversions: 342,
    cpa: 44.54,
    roas: 3.82,
  };

  // 模擬數據 - 前期數據（稍微不同以顯示變化）
  const previous = {
    spend: 14520.00,
    impressions: 498200,
    clicks: 11920,
    conversions: 315,
    cpa: 46.10,
    roas: 3.65,
  };

  return {
    period,
    currentPeriod,
    previousPeriod,
    metrics: {
      spend: { current: current.spend, previous: previous.spend },
      impressions: { current: current.impressions, previous: previous.impressions },
      clicks: { current: current.clicks, previous: previous.clicks },
      conversions: { current: current.conversions, previous: previous.conversions },
      cpa: { current: current.cpa, previous: previous.cpa },
      roas: { current: current.roas, previous: previous.roas },
    },
  };
}

/**
 * 期間比較數據 Hook
 *
 * @param period - 期間類型
 * @returns 比較數據、載入狀態、錯誤
 */
export function usePeriodComparison(period: TimePeriod) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 使用 useMemo 來記憶計算結果，避免不必要的重渲染
  const data = useMemo(() => {
    try {
      // 目前使用模擬數據
      // TODO: 實際連接 API 時替換為 fetch 呼叫
      return generateMockComparisonData(period);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    }
  }, [period]);

  return { data, isLoading, error };
}
