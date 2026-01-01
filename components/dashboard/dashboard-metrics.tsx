'use client';

import { useDashboardOverview } from '@/hooks/use-dashboard-overview';
import { MetricCard } from './metric-card';
import type { TimePeriod } from '@/lib/api/types';

/**
 * 儀表板指標元件屬性
 */
interface DashboardMetricsProps {
  /** 時間週期 */
  period?: TimePeriod;
}

/**
 * 儀表板指標骨架屏
 */
function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse"
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * 儀表板核心指標區塊
 *
 * 使用 useDashboardOverview hook 獲取數據
 * 顯示 6 個核心指標：總花費、曝光、點擊、轉換、CPA、ROAS
 */
export function DashboardMetrics({ period = '7d' }: DashboardMetricsProps) {
  const { data, isLoading, error } = useDashboardOverview(period);

  if (isLoading) {
    return <MetricsSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">
          載入數據時發生錯誤: {error.message}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-gray-500 dark:text-gray-400">尚無數據</p>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        title="總花費"
        value={`$${metrics.spend.value.toLocaleString()}`}
        change={metrics.spend.change}
        status={metrics.spend.status}
        termId="spend"
      />
      <MetricCard
        title="曝光次數"
        value={metrics.impressions.value.toLocaleString()}
        change={metrics.impressions.change}
        status={metrics.impressions.status}
        termId="impressions"
      />
      <MetricCard
        title="點擊數"
        value={metrics.clicks.value.toLocaleString()}
        change={metrics.clicks.change}
        status={metrics.clicks.status}
        termId="clicks"
      />
      <MetricCard
        title="轉換數"
        value={metrics.conversions.value.toLocaleString()}
        change={metrics.conversions.change}
        status={metrics.conversions.status}
        termId="conversions"
      />
      <MetricCard
        title="CPA"
        value={`$${metrics.cpa.value.toFixed(2)}`}
        change={metrics.cpa.change}
        status={metrics.cpa.status}
        invertChange
        termId="cpa"
      />
      <MetricCard
        title="ROAS"
        value={`${metrics.roas.value.toFixed(1)}x`}
        change={metrics.roas.change}
        status={metrics.roas.status}
        termId="roas"
      />
    </div>
  );
}
