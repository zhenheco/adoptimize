import type { TimePeriod } from '@/lib/api/types';

/**
 * 比較指標數據結構
 */
export interface ComparisonMetric {
  /** 當期數值 */
  current: number;
  /** 前期數值 */
  previous: number;
}

/**
 * 期間比較數據結構
 */
export interface PeriodComparisonData {
  /** 當前選擇的期間類型 */
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
  /** 各指標比較數據 */
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
 * 期間變化格式化結果
 */
export interface PeriodComparisonResult {
  /** 格式化的變化百分比字串 */
  formattedChange: string;
  /** 變化方向 */
  direction: 'up' | 'down' | 'neutral';
  /** CSS 顏色類別 */
  colorClass: string;
}

/**
 * 計算期間變化百分比
 *
 * 公式: (當期 - 前期) / 前期 * 100
 *
 * @param current - 當期數值
 * @param previous - 前期數值
 * @returns 變化百分比（精確到一位小數）
 *
 * @example
 * calculatePeriodChange(120, 100) // => 20.0 (增長 20%)
 * calculatePeriodChange(80, 100)  // => -20.0 (下降 20%)
 */
export function calculatePeriodChange(current: number, previous: number): number {
  // 處理前期為 0 的特殊情況
  if (previous === 0) {
    // 當期也為 0，則無變化
    if (current === 0) {
      return 0;
    }
    // 有當期值但前期為 0，視為 100% 增長
    return 100;
  }

  // 標準計算: (當期 - 前期) / 前期 * 100
  const change = ((current - previous) / previous) * 100;

  // 四捨五入到一位小數
  return Math.round(change * 10) / 10;
}

/**
 * 取得期間標籤
 */
export function getPeriodLabel(period: TimePeriod): string {
  const labels: Record<TimePeriod, string> = {
    today: '今日',
    '7d': '過去 7 天',
    '30d': '過去 30 天',
    custom: '自訂範圍',
  };
  return labels[period];
}

/**
 * 取得前期標籤
 */
export function getPreviousPeriodLabel(period: TimePeriod): string {
  const labels: Record<TimePeriod, string> = {
    today: '昨日',
    '7d': '前 7 天',
    '30d': '前 30 天',
    custom: '同期',
  };
  return labels[period];
}

/**
 * 格式化期間比較結果
 *
 * @param change - 變化百分比
 * @param inverted - 是否反轉顏色邏輯（如 CPA：下降為好）
 * @returns 格式化結果，包含字串、方向和顏色類別
 *
 * @example
 * formatPeriodComparison(15.5)
 * // => { formattedChange: '+15.5%', direction: 'up', colorClass: 'text-green-600...' }
 *
 * formatPeriodComparison(-10, true) // CPA 下降是好事
 * // => { formattedChange: '-10.0%', direction: 'down', colorClass: 'text-green-600...' }
 */
export function formatPeriodComparison(
  change: number,
  inverted: boolean = false
): PeriodComparisonResult {
  // 限制顯示最大值為 999.9%
  const cappedChange = Math.min(Math.abs(change), 999.9);
  const actualChange = change < 0 ? -cappedChange : cappedChange;

  // 格式化百分比
  const sign = actualChange > 0 ? '+' : '';
  const formattedChange = `${sign}${actualChange.toFixed(1)}%`;

  // 判斷方向
  let direction: 'up' | 'down' | 'neutral';
  if (change > 0) {
    direction = 'up';
  } else if (change < 0) {
    direction = 'down';
  } else {
    direction = 'neutral';
  }

  // 決定顏色 - 考慮反轉邏輯
  let colorClass: string;
  if (direction === 'neutral') {
    colorClass = 'text-gray-500 dark:text-gray-400';
  } else if (inverted) {
    // 反轉邏輯：下降為好（如 CPA）
    colorClass = direction === 'down'
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  } else {
    // 正常邏輯：上升為好
    colorClass = direction === 'up'
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  }

  return {
    formattedChange,
    direction,
    colorClass,
  };
}
