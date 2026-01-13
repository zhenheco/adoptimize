'use client';

import { useState } from 'react';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { TimeFilter } from '@/components/dashboard/time-filter';
import { TrendChartWrapper } from '@/components/dashboard/trend-chart-wrapper';
import { PeriodComparisonWrapper } from '@/components/dashboard/period-comparison-wrapper';
import type { TimePeriod } from '@/lib/api/types';

/**
 * 儀表板總覽頁面
 *
 * 顯示跨平台廣告數據摘要，包含：
 * - 核心指標卡片（花費、曝光、點擊、轉換、CPA、ROAS）
 * - 效能趨勢圖表
 *
 * 數據來源: /api/v1/dashboard/overview
 */
export default function DashboardPage() {
  const [period, setPeriod] = useState<TimePeriod>('7d');

  return (
    <div className="space-y-6">
      {/* 頁面標題與時間篩選器 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            儀表板總覽
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            跨平台廣告效果一覽
          </p>
        </div>
        <TimeFilter value={period} onChange={setPeriod} />
      </div>

      {/* 核心指標卡片（從 API 獲取數據） */}
      <DashboardMetrics period={period} />

      {/* D-006: 期間比較表格 */}
      <PeriodComparisonWrapper period={period} />

      {/* 趨勢圖表區域 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          效能趨勢
        </h2>
        <TrendChartWrapper />
      </div>
    </div>
  );
}
