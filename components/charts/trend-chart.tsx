'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/**
 * 趨勢數據點介面
 */
export interface TrendDataPoint {
  date: string;
  [key: string]: string | number;
}

/**
 * 指標線設定
 */
export interface MetricLine {
  key: string;
  name: string;
  color: string;
}

/**
 * TrendChart 元件屬性
 */
export interface TrendChartProps {
  /** 時間序列數據 */
  data: TrendDataPoint[];
  /** 要顯示的指標線 */
  metrics: MetricLine[];
  /** 圖表高度 */
  height?: number;
}

/**
 * 趨勢圖表元件
 * 使用 Recharts 繪製時間序列數據
 *
 * @example
 * <TrendChart
 *   data={[
 *     { date: '12/01', spend: 100, clicks: 500 },
 *     { date: '12/02', spend: 120, clicks: 600 },
 *   ]}
 *   metrics={[
 *     { key: 'spend', name: '花費', color: '#3b82f6' },
 *     { key: 'clicks', name: '點擊', color: '#10b981' },
 *   ]}
 * />
 */
export function TrendChart({
  data,
  metrics,
  height = 300,
}: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Legend />
        {metrics.map((metric) => (
          <Line
            key={metric.key}
            type="monotone"
            dataKey={metric.key}
            name={metric.name}
            stroke={metric.color}
            strokeWidth={2}
            dot={{ fill: metric.color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * 範例數據生成器（僅供開發測試）
 */
export function generateMockTrendData(days: number = 7): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const baseDate = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);

    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      spend: Math.round(100 + Math.random() * 50),
      impressions: Math.round(5000 + Math.random() * 2000),
      clicks: Math.round(200 + Math.random() * 100),
      conversions: Math.round(10 + Math.random() * 10),
      cpa: Math.round((10 + Math.random() * 5) * 100) / 100,
      roas: Math.round((2 + Math.random() * 2) * 100) / 100,
    });
  }

  return data;
}
