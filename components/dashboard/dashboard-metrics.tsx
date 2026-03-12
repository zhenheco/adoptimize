"use client";

import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { MetricCard, type MetricStatus } from "./metric-card";
import type { TimePeriod } from "@/lib/api/types";
import { useTranslations } from "next-intl";

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
export function DashboardMetrics({ period = "7d" }: DashboardMetricsProps) {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardOverview(period);

  if (isLoading) {
    return <MetricsSkeleton />;
  }

  // API 失敗或無數據時使用展示資料
  const fallbackMetrics: Record<
    string,
    { value: number; change: number; status: MetricStatus }
  > = {
    spend: { value: 128450, change: -12, status: "warning" },
    impressions: { value: 584200, change: 8, status: "normal" },
    clicks: { value: 23680, change: 5, status: "normal" },
    conversions: { value: 3847, change: 23, status: "normal" },
    cpa: { value: 333.87, change: -15, status: "normal" },
    roas: { value: 4.2, change: 19, status: "normal" },
  };

  const metrics = data?.metrics ?? fallbackMetrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        title={t("totalSpend")}
        value={`$${metrics.spend.value.toLocaleString()}`}
        change={metrics.spend.change}
        status={metrics.spend.status}
        termId="spend"
      />
      <MetricCard
        title={t("impressions")}
        value={metrics.impressions.value.toLocaleString()}
        change={metrics.impressions.change}
        status={metrics.impressions.status}
        termId="impressions"
      />
      <MetricCard
        title={t("clicks")}
        value={metrics.clicks.value.toLocaleString()}
        change={metrics.clicks.change}
        status={metrics.clicks.status}
        termId="clicks"
      />
      <MetricCard
        title={t("conversionCount")}
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
