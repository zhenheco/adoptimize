'use client';

import { useState } from 'react';
import {
  Pause,
  TrendingDown,
  Users,
  RefreshCw,
  TrendingUp,
  Settings,
  PlayCircle,
  XCircle,
  Loader2,
  CheckCircle2,
  Ban,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Recommendation } from '@/lib/api/types';
import {
  getSnoozeOptions,
  formatSnoozeRemaining,
  type SnoozeDuration,
} from '@/lib/utils/snooze-utils';

/**
 * 取得建議類型圖示與顏色
 */
function getTypeInfo(type: string): {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  label: string;
} {
  switch (type) {
    case 'PAUSE_CREATIVE':
      return {
        icon: <Pause className="w-5 h-5" />,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-600 dark:text-red-400',
        label: '暫停素材',
      };
    case 'REDUCE_BUDGET':
      return {
        icon: <TrendingDown className="w-5 h-5" />,
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-600 dark:text-orange-400',
        label: '降低預算',
      };
    case 'EXCLUDE_AUDIENCE':
      return {
        icon: <Users className="w-5 h-5" />,
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        textColor: 'text-purple-600 dark:text-purple-400',
        label: '排除受眾',
      };
    case 'REFRESH_CREATIVE':
      return {
        icon: <RefreshCw className="w-5 h-5" />,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        label: '更新素材',
      };
    case 'INCREASE_BUDGET':
      return {
        icon: <TrendingUp className="w-5 h-5" />,
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-600 dark:text-green-400',
        label: '增加預算',
      };
    case 'OPTIMIZE_BIDDING':
      return {
        icon: <Settings className="w-5 h-5" />,
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        label: '優化出價',
      };
    default:
      return {
        icon: <Settings className="w-5 h-5" />,
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        textColor: 'text-gray-600 dark:text-gray-400',
        label: '優化建議',
      };
  }
}

/**
 * 取得優先級標籤
 */
function getPriorityLabel(score: number): {
  label: string;
  className: string;
} {
  if (score >= 150) {
    return {
      label: '緊急',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
  }
  if (score >= 100) {
    return {
      label: '重要',
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    };
  }
  return {
    label: '一般',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
}

/**
 * 格式化金額顯示
 */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onExecute: (recommendation: Recommendation) => Promise<void>;
  onIgnore: (recommendation: Recommendation) => Promise<void>;
  onSnooze?: (recommendation: Recommendation, duration: SnoozeDuration) => Promise<void>;
}

/**
 * 建議卡片元件
 *
 * 顯示建議詳情、優先級與執行按鈕
 */
export function RecommendationCard({
  recommendation,
  onExecute,
  onIgnore,
  onSnooze,
}: RecommendationCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);
  const [isSnoozeing, setIsSnoozeing] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const typeInfo = getTypeInfo(recommendation.type);
  const priorityInfo = getPriorityLabel(recommendation.priority_score);
  const snoozeOptions = getSnoozeOptions();

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute(recommendation);
    } catch (error) {
      console.error('Execute failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleIgnore = async () => {
    setIsIgnoring(true);
    try {
      await onIgnore(recommendation);
    } catch (error) {
      console.error('Ignore failed:', error);
    } finally {
      setIsIgnoring(false);
    }
  };

  const handleSnooze = async (duration: SnoozeDuration) => {
    if (!onSnooze) return;

    setIsSnoozeing(true);
    setShowSnoozeMenu(false);
    try {
      await onSnooze(recommendation, duration);
    } catch (error) {
      console.error('Snooze failed:', error);
    } finally {
      setIsSnoozeing(false);
    }
  };

  const isLoading = isExecuting || isIgnoring || isSnoozeing;

  // 根據狀態顯示不同的 UI
  if (recommendation.status === 'executed') {
    return (
      <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          <div>
            <span className="font-medium text-green-800 dark:text-green-300">已執行</span>
            <span className="text-green-600 dark:text-green-400 ml-2">{recommendation.title}</span>
          </div>
        </div>
      </div>
    );
  }

  if (recommendation.status === 'ignored') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 opacity-60">
        <div className="flex items-center gap-3">
          <Ban className="w-6 h-6 text-gray-400" />
          <div>
            <span className="font-medium text-gray-500 dark:text-gray-400">已忽略</span>
            <span className="text-gray-400 dark:text-gray-500 ml-2">{recommendation.title}</span>
          </div>
        </div>
      </div>
    );
  }

  if (recommendation.status === 'snoozed') {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-medium text-amber-800 dark:text-amber-300">已延後</span>
              <span className="text-amber-600 dark:text-amber-400 ml-2">{recommendation.title}</span>
              {recommendation.snooze_until && (
                <span className="text-amber-500 dark:text-amber-500 ml-2 text-sm">
                  ({formatSnoozeRemaining(recommendation.snooze_until)})
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExecute}
            disabled={isLoading}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-1" />
            )}
            立即執行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* 類型圖示 */}
        <div className={`p-3 rounded-lg ${typeInfo.bgColor}`}>
          <div className={typeInfo.textColor}>{typeInfo.icon}</div>
        </div>

        {/* 內容區 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityInfo.className}`}>
              {priorityInfo.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor}`}>
              {typeInfo.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              優先級: {recommendation.priority_score}
            </span>
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {recommendation.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {recommendation.description}
          </p>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span>預估節省: {formatCurrency(recommendation.estimated_impact)}/週</span>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={isLoading}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-1" />
            )}
            執行
          </Button>

          {/* 延後處理按鈕 */}
          {onSnooze && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                disabled={isLoading}
                className="w-full"
              >
                {isSnoozeing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 mr-1" />
                )}
                稍後
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>

              {/* 延後選項下拉選單 */}
              {showSnoozeMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  {snoozeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSnooze(option.value)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleIgnore}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700"
          >
            {isIgnoring ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-1" />
            )}
            忽略
          </Button>
        </div>
      </div>
    </div>
  );
}
