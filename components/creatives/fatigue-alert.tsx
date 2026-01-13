'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { CreativeFatigue } from '@/lib/api/types';
import { getOptimizationSuggestions, type OptimizationSuggestion } from '@/lib/utils/optimization-suggestions';

/**
 * FatigueAlert 元件屬性
 */
export interface FatigueAlertProps {
  /** 疲勞度資訊 */
  fatigue: CreativeFatigue;
}

/**
 * 疲勞警示元件
 *
 * 根據疲勞度狀態顯示不同等級的警示：
 * - 🔴 fatigued (score > 70): 紅色 banner，立即更換
 * - 🟡 warning (score 41-70): 黃色提示，準備替換
 * - 🟢 healthy (score <= 40): 不顯示
 *
 * @example
 * ```tsx
 * <FatigueAlert fatigue={{ score: 75, status: 'fatigued', ctr_change: -20, frequency: 4, days_active: 30 }} />
 * ```
 */
export function FatigueAlert({ fatigue }: FatigueAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 健康狀態不顯示警示
  if (fatigue.status === 'healthy' || fatigue.score <= 40) {
    return null;
  }

  const isDanger = fatigue.status === 'fatigued' || fatigue.score > 70;
  const suggestions = getOptimizationSuggestions(fatigue);

  return (
    <div
      role="alert"
      aria-label={`素材疲勞警示：${isDanger ? '疲勞' : '注意'}`}
      className={cn(
        'rounded-lg p-3 border transition-all',
        isDanger
          ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      )}
    >
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle
            data-testid="fatigue-alert-icon"
            className={cn(
              'w-4 h-4',
              isDanger ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
            )}
          />
          <span
            className={cn(
              'text-sm font-medium',
              isDanger ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
            )}
          >
            {isDanger ? '立即更換素材' : '準備替換素材'}
          </span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              isDanger
                ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200'
            )}
          >
            疲勞度 {fatigue.score}
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors',
            isDanger
              ? 'text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-800'
              : 'text-yellow-700 hover:bg-yellow-100 dark:text-yellow-300 dark:hover:bg-yellow-800'
          )}
        >
          {isExpanded ? (
            <>
              收起
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              查看建議
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* 詳細建議 */}
      {isExpanded && (
        <div data-testid="fatigue-details" className="mt-3 pt-3 border-t border-current/10">
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionItem key={index} suggestion={suggestion} isDanger={isDanger} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 建議項目元件
 */
function SuggestionItem({
  suggestion,
  isDanger,
}: {
  suggestion: OptimizationSuggestion;
  isDanger: boolean;
}) {
  return (
    <div
      data-testid="suggestion-item"
      className={cn(
        'flex items-start gap-2 text-sm p-2 rounded',
        isDanger
          ? 'bg-red-100/50 dark:bg-red-900/30'
          : 'bg-yellow-100/50 dark:bg-yellow-900/30'
      )}
    >
      <span className="text-base">{suggestion.icon}</span>
      <div>
        <p
          className={cn(
            'font-medium',
            isDanger ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
          )}
        >
          {suggestion.title}
        </p>
        <p
          className={cn(
            'text-xs mt-0.5',
            isDanger ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'
          )}
        >
          {suggestion.description}
        </p>
      </div>
    </div>
  );
}
