'use client';

import { cn } from '@/lib/utils';
import type { AuditDimension } from '@/lib/api/types';

/**
 * DimensionCard 元件屬性
 */
interface DimensionCardProps {
  /** 維度名稱 */
  name: string;
  /** 維度標籤 */
  label: string;
  /** 維度資料 */
  dimension: AuditDimension;
  /** 點擊回調 */
  onClick?: () => void;
}

/**
 * 取得分數顏色
 */
function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * 取得進度條顏色
 */
function getBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * 維度圖示
 */
const dimensionIcons: Record<string, string> = {
  structure: '🏗️',
  creative: '🎨',
  audience: '👥',
  budget: '💰',
  tracking: '📊',
};

/**
 * 健檢維度卡片元件
 *
 * 顯示單一健檢維度的分數和問題數量
 */
export function DimensionCard({
  name,
  label,
  dimension,
  onClick,
}: DimensionCardProps) {
  const { score, weight, issues } = dimension;
  const weightPercent = Math.round(weight * 100);

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700'
      )}
      onClick={onClick}
    >
      {/* 標題 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{dimensionIcons[name] || '📋'}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          權重 {weightPercent}%
        </span>
      </div>

      {/* 分數 */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className={cn('text-3xl font-bold', getScoreColor(score))}>
          {score}
        </span>
        <span className="text-sm text-gray-400">/ 100</span>
      </div>

      {/* 進度條 */}
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all', getBarColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* 問題數量 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {issues} 個問題
        </span>
        {issues > 0 && (
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            查看詳情 →
          </span>
        )}
      </div>
    </div>
  );
}
