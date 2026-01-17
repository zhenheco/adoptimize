'use client';

import { useEffect, useState } from 'react';
import { TrendChart, TrendDataPoint } from '@/components/charts/trend-chart';

/**
 * 趨勢圖表包裝元件
 * 客戶端元件，從 API 獲取趨勢數據
 */
export function TrendChartWrapper() {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await fetch('/api/v1/dashboard/trends?period=7d');
        if (response.ok) {
          const result = await response.json();
          // 轉換 API 數據格式為圖表格式
          const chartData = (result.data || []).map((item: {
            date: string;
            spend: number;
            clicks: number;
            conversions: number;
          }) => ({
            date: item.date.slice(5), // 只取 MM-DD
            spend: item.spend,
            clicks: item.clicks,
            conversions: item.conversions,
          }));
          setData(chartData);
        }
      } catch (error) {
        console.error('Failed to fetch trends:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrends();
  }, []);

  const metrics = [
    { key: 'spend', name: '花費 ($)', color: '#3b82f6' },
    { key: 'clicks', name: '點擊', color: '#10b981' },
    { key: 'conversions', name: '轉換', color: '#f59e0b' },
  ];

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">載入中...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        尚無趨勢數據，請先連接廣告帳戶
      </div>
    );
  }

  return <TrendChart data={data} metrics={metrics} height={256} />;
}
