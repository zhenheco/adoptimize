import { cn, formatChange, getStatusIcon } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TermTooltip } from '@/components/ui/term-tooltip';

/**
 * 指標狀態類型
 */
export type MetricStatus = 'normal' | 'warning' | 'danger';

/**
 * MetricCard 元件屬性
 */
export interface MetricCardProps {
  /** 指標標題 */
  title: string;
  /** 指標數值（已格式化的字串） */
  value: string;
  /** 相較於前期的變化百分比 */
  change: number;
  /** 指標狀態 */
  status: MetricStatus;
  /** 是否反轉變化顏色（例如 CPA 下降是好事） */
  invertChange?: boolean;
  /** 術語 ID，用於顯示解釋 Tooltip */
  termId?: string;
}

/**
 * 指標卡片元件
 * 用於顯示關鍵廣告效能指標
 *
 * @example
 * <MetricCard
 *   title="總花費"
 *   value="$1,500.00"
 *   change={-5.2}
 *   status="normal"
 * />
 */
export function MetricCard({
  title,
  value,
  change,
  status,
  invertChange = false,
  termId,
}: MetricCardProps) {
  // 判斷變化方向是否為正向
  const isPositiveChange = invertChange ? change < 0 : change > 0;
  const isNeutral = change === 0;

  // 取得變化圖示
  const ChangeIcon = isNeutral
    ? Minus
    : isPositiveChange
    ? TrendingUp
    : TrendingDown;

  // 取得變化顏色
  const changeColor = isNeutral
    ? 'text-gray-500'
    : isPositiveChange
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* 標題與狀態 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
          {title}
          {termId && <TermTooltip termId={termId} />}
        </span>
        <span className="text-sm" title={`狀態: ${status}`}>
          {getStatusIcon(status)}
        </span>
      </div>

      {/* 數值 */}
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {value}
      </div>

      {/* 變化指標 */}
      <div className={cn('flex items-center gap-1 text-sm', changeColor)}>
        <ChangeIcon className="w-4 h-4" />
        <span>{formatChange(change)}</span>
        <span className="text-gray-400 dark:text-gray-500 ml-1">
          vs 上期
        </span>
      </div>
    </div>
  );
}
