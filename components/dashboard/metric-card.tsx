import { cn, formatChange, getStatusIcon, getAnomalyStatus, type AnomalyStatus } from '@/lib/utils';
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
 * 取得異常標記的圖示和樣式
 */
function getAnomalyMarkerInfo(anomalyStatus: AnomalyStatus): {
  icon: string;
  title: string;
  className: string;
} | null {
  switch (anomalyStatus) {
    case 'danger':
      return {
        icon: '⚠️',
        title: '異常警示: 嚴重下降',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
      };
    case 'warning':
      return {
        icon: '⚡',
        title: '異常警示: 中度下降',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
      };
    default:
      return null;
  }
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

  // D-005: 計算異常狀態
  const anomalyStatus = getAnomalyStatus(change);
  const anomalyMarker = getAnomalyMarkerInfo(anomalyStatus);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* 標題與狀態 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
          {title}
          {termId && <TermTooltip termId={termId} />}
        </span>
        <div className="flex items-center gap-1">
          {/* D-005: 異常警示標記 */}
          {anomalyMarker && (
            <span
              data-testid="anomaly-marker"
              data-anomaly={anomalyStatus}
              title={anomalyMarker.title}
              className={cn(
                'text-xs px-1.5 py-0.5 rounded border',
                anomalyMarker.className
              )}
            >
              {anomalyMarker.icon}
            </span>
          )}
          <span className="text-sm" title={`狀態: ${status}`}>
            {getStatusIcon(status)}
          </span>
        </div>
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
