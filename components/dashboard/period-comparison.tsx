'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TimePeriod } from '@/lib/api/types';
import {
  calculatePeriodChange,
  formatPeriodComparison,
  getPreviousPeriodLabel,
  type ComparisonMetric,
} from '@/lib/utils/period-comparison';

/**
 * 格式化日期為月/日格式
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 格式化數值
 */
function formatValue(value: number, type: 'currency' | 'number' | 'multiplier'): string {
  switch (type) {
    case 'currency':
      return `$${value.toLocaleString()}`;
    case 'multiplier':
      return `${value.toFixed(1)}x`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}

/**
 * PeriodComparison 元件屬性
 */
export interface PeriodComparisonProps {
  /** 期間類型 */
  period: TimePeriod;
  /** 當期日期範圍 */
  currentPeriod: {
    start: string;
    end: string;
  };
  /** 前期日期範圍 */
  previousPeriod: {
    start: string;
    end: string;
  };
  /** 指標比較數據 */
  metrics: {
    spend: ComparisonMetric;
    impressions: ComparisonMetric;
    clicks: ComparisonMetric;
    conversions: ComparisonMetric;
    cpa: ComparisonMetric;
    roas: ComparisonMetric;
  };
}

/**
 * 單一指標比較項目
 */
interface MetricRowProps {
  /** 指標名稱 */
  label: string;
  /** 當期數值 */
  currentValue: string;
  /** 前期數值 */
  previousValue: string;
  /** 變化百分比 */
  change: number;
  /** 是否反轉顏色（如 CPA） */
  inverted?: boolean;
  /** 測試 ID */
  testId: string;
}

/**
 * 指標行元件
 */
function MetricRow({
  label,
  currentValue,
  previousValue,
  change,
  inverted = false,
  testId,
}: MetricRowProps) {
  const { formattedChange, direction, colorClass } = formatPeriodComparison(change, inverted);

  // 選擇方向圖示
  const DirectionIcon =
    direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      {/* 指標名稱 */}
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>

      {/* 數值區塊 */}
      <div className="flex items-center gap-4">
        {/* 當期數值 */}
        <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[80px] text-right">
          {currentValue}
        </span>

        {/* 前期數值 */}
        <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[80px] text-right">
          {previousValue}
        </span>

        {/* 變化百分比 */}
        <span
          data-testid={`${testId}-change`}
          className={cn('flex items-center gap-1 text-sm font-medium min-w-[80px] justify-end', colorClass)}
        >
          <DirectionIcon data-direction={direction} className="w-3.5 h-3.5" />
          <span>{formattedChange}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * 期間比較元件
 *
 * 顯示當期 vs 前期的指標比較，支援 7D vs 7D、30D vs 30D 比較
 *
 * 驗收標準:
 * - AC1: 顯示 vs 上期 比較數據
 * - AC2: 支援 7D vs 7D、30D vs 30D 比較
 * - AC3: 差異使用箭頭+百分比顯示
 *
 * @example
 * <PeriodComparison
 *   period="7d"
 *   currentPeriod={{ start: '2024-12-25', end: '2024-12-31' }}
 *   previousPeriod={{ start: '2024-12-18', end: '2024-12-24' }}
 *   metrics={{
 *     spend: { current: 1500, previous: 1200 },
 *     // ... other metrics
 *   }}
 * />
 */
export function PeriodComparison({
  period,
  currentPeriod,
  previousPeriod,
  metrics,
}: PeriodComparisonProps) {
  // 計算各指標變化
  const changes = {
    spend: calculatePeriodChange(metrics.spend.current, metrics.spend.previous),
    impressions: calculatePeriodChange(metrics.impressions.current, metrics.impressions.previous),
    clicks: calculatePeriodChange(metrics.clicks.current, metrics.clicks.previous),
    conversions: calculatePeriodChange(metrics.conversions.current, metrics.conversions.previous),
    cpa: calculatePeriodChange(metrics.cpa.current, metrics.cpa.previous),
    roas: calculatePeriodChange(metrics.roas.current, metrics.roas.previous),
  };

  // 格式化日期範圍
  const currentRange = `${formatDate(currentPeriod.start)} - ${formatDate(currentPeriod.end)}`;
  const previousRange = `${formatDate(previousPeriod.start)} - ${formatDate(previousPeriod.end)}`;

  return (
    <div
      data-testid="period-comparison"
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <h3 role="heading" className="text-base font-semibold text-gray-900 dark:text-white">
          期間比較 <span className="text-gray-500 dark:text-gray-400 font-normal">vs {getPreviousPeriodLabel(period)}</span>
        </h3>
      </div>

      {/* 日期範圍標題列 */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 dark:border-gray-600">
        <span className="text-xs text-gray-500 dark:text-gray-400">指標</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px] text-right">
            {currentRange}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px] text-right">
            {previousRange}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px] text-right">
            變化
          </span>
        </div>
      </div>

      {/* 指標網格 */}
      <div data-testid="metrics-grid" className="grid gap-0">
        <MetricRow
          label="總花費"
          currentValue={formatValue(metrics.spend.current, 'currency')}
          previousValue={formatValue(metrics.spend.previous, 'currency')}
          change={changes.spend}
          testId="spend"
        />
        <MetricRow
          label="曝光"
          currentValue={formatValue(metrics.impressions.current, 'number')}
          previousValue={formatValue(metrics.impressions.previous, 'number')}
          change={changes.impressions}
          testId="impressions"
        />
        <MetricRow
          label="點擊"
          currentValue={formatValue(metrics.clicks.current, 'number')}
          previousValue={formatValue(metrics.clicks.previous, 'number')}
          change={changes.clicks}
          testId="clicks"
        />
        <MetricRow
          label="轉換"
          currentValue={formatValue(metrics.conversions.current, 'number')}
          previousValue={formatValue(metrics.conversions.previous, 'number')}
          change={changes.conversions}
          testId="conversions"
        />
        <MetricRow
          label="CPA"
          currentValue={formatValue(metrics.cpa.current, 'currency')}
          previousValue={formatValue(metrics.cpa.previous, 'currency')}
          change={changes.cpa}
          inverted // CPA 下降是好事
          testId="cpa"
        />
        <MetricRow
          label="ROAS"
          currentValue={formatValue(metrics.roas.current, 'multiplier')}
          previousValue={formatValue(metrics.roas.previous, 'multiplier')}
          change={changes.roas}
          testId="roas"
        />
      </div>
    </div>
  );
}
