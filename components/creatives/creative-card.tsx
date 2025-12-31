'use client';

import { cn } from '@/lib/utils';
import { Image, Play, Layers, MoreVertical, Pause, PlayCircle } from 'lucide-react';
import type { Creative, FatigueStatus } from '@/lib/api/types';

/**
 * CreativeCard 元件屬性
 */
export interface CreativeCardProps {
  /** 素材資訊 */
  creative: Creative;
  /** 點擊素材的回調 */
  onClick?: (creative: Creative) => void;
  /** 暫停/啟用素材的回調 */
  onToggleStatus?: (creative: Creative) => void;
}

/**
 * 取得疲勞狀態圖示
 */
function getFatigueStatusIcon(status: FatigueStatus): string {
  switch (status) {
    case 'healthy':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'fatigued':
      return '🔴';
    default:
      return '⚪';
  }
}

/**
 * 取得疲勞狀態標籤
 */
function getFatigueLabel(status: FatigueStatus): string {
  switch (status) {
    case 'healthy':
      return '健康';
    case 'warning':
      return '注意';
    case 'fatigued':
      return '疲勞';
    default:
      return '未知';
  }
}

/**
 * 取得疲勞度進度條顏色
 */
function getFatigueBarColor(score: number): string {
  if (score <= 40) return 'bg-green-500';
  if (score <= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * 取得素材類型圖示
 */
function getTypeIcon(type: Creative['type']) {
  switch (type) {
    case 'VIDEO':
      return <Play className="w-4 h-4" />;
    case 'CAROUSEL':
      return <Layers className="w-4 h-4" />;
    case 'IMAGE':
    default:
      return <Image className="w-4 h-4" />;
  }
}

/**
 * 素材效能卡片元件
 *
 * 顯示單一素材的縮圖、效能指標和疲勞度
 *
 * @example
 * <CreativeCard
 *   creative={creative}
 *   onClick={(c) => openDetail(c)}
 *   onToggleStatus={(c) => toggleStatus(c)}
 * />
 */
export function CreativeCard({
  creative,
  onClick,
  onToggleStatus,
}: CreativeCardProps) {
  const { name, type, thumbnail_url, metrics, fatigue, status } = creative;
  const isPaused = status === 'paused';

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden transition-all hover:shadow-md cursor-pointer',
        isPaused
          ? 'border-gray-300 dark:border-gray-600 opacity-75'
          : 'border-gray-200 dark:border-gray-700'
      )}
      onClick={() => onClick?.(creative)}
    >
      {/* 縮圖區域 */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-900">
        {thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            {getTypeIcon(type)}
          </div>
        )}

        {/* 類型標籤 */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          {getTypeIcon(type)}
          <span>{type}</span>
        </div>

        {/* 狀態標籤 */}
        {isPaused && (
          <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
            已暫停
          </div>
        )}
      </div>

      {/* 內容區域 */}
      <div className="p-4">
        {/* 名稱與選單 */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
            {name}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus?.(creative);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title={isPaused ? '啟用素材' : '暫停素材'}
          >
            {isPaused ? (
              <PlayCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Pause className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* 效能指標 */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-gray-500 dark:text-gray-400">CTR</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {(metrics.ctr * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">轉換</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {metrics.conversions.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">花費</span>
            <p className="font-medium text-gray-900 dark:text-white">
              ${metrics.spend.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">曝光</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {metrics.impressions.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 疲勞度指標 */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              疲勞度
            </span>
            <span className="text-xs flex items-center gap-1">
              {getFatigueStatusIcon(fatigue.status)}
              <span className="text-gray-600 dark:text-gray-300">
                {getFatigueLabel(fatigue.status)}
              </span>
            </span>
          </div>
          {/* 疲勞度進度條 */}
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getFatigueBarColor(fatigue.score))}
              style={{ width: `${Math.min(fatigue.score, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
            <span>分數: {fatigue.score}</span>
            <span>活躍 {fatigue.days_active} 天</span>
          </div>
        </div>
      </div>
    </div>
  );
}
