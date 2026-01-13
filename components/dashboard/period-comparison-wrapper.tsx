'use client';

import { usePeriodComparison } from '@/hooks/use-period-comparison';
import { PeriodComparison } from './period-comparison';
import type { TimePeriod } from '@/lib/api/types';

/**
 * PeriodComparisonWrapper 屬性
 */
interface PeriodComparisonWrapperProps {
  /** 期間類型 */
  period: TimePeriod;
}

/**
 * 骨架屏載入狀態
 */
function PeriodComparisonSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 期間比較元件包裝器
 *
 * 負責獲取數據並傳遞給 PeriodComparison 元件
 * 處理載入狀態和錯誤狀態
 */
export function PeriodComparisonWrapper({ period }: PeriodComparisonWrapperProps) {
  const { data, isLoading, error } = usePeriodComparison(period);

  if (isLoading) {
    return <PeriodComparisonSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">
          載入期間比較數據時發生錯誤: {error.message}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-gray-500 dark:text-gray-400">尚無比較數據</p>
      </div>
    );
  }

  return (
    <PeriodComparison
      period={data.period}
      currentPeriod={data.currentPeriod}
      previousPeriod={data.previousPeriod}
      metrics={data.metrics}
    />
  );
}
