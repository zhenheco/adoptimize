'use client';

import { TrendChart, generateMockTrendData } from '@/components/charts/trend-chart';

/**
 * 趨勢圖表包裝元件
 * 客戶端元件，用於在 Server Component 中使用 Recharts
 *
 * @example
 * // In a Server Component:
 * <TrendChartWrapper />
 */
export function TrendChartWrapper() {
  // TODO: 從 API 獲取實際數據
  const data = generateMockTrendData(7);

  const metrics = [
    { key: 'spend', name: '花費 ($)', color: '#3b82f6' },
    { key: 'clicks', name: '點擊', color: '#10b981' },
    { key: 'conversions', name: '轉換', color: '#f59e0b' },
  ];

  return <TrendChart data={data} metrics={metrics} height={256} />;
}
