'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  DollarSign,
  TrendingDown,
  Percent,
  Loader2,
  X,
  GitMerge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AudienceOverlapPair } from '@/lib/utils/audience-overlap';
import {
  generateExclusionSuggestion,
  getExclusionPriority,
  formatImpactSummary,
  type SpendData,
  type ExclusionPriority,
} from '@/lib/utils/exclusion-suggestions';

/**
 * 執行排除操作的參數
 */
export interface ExecuteExclusionParams {
  sourceAudienceId: string;
  excludeAudienceId: string;
  sourceAudienceName: string;
  excludeAudienceName: string;
}

/**
 * ExclusionSuggestion 元件屬性
 */
export interface ExclusionSuggestionProps {
  /** 重疊配對資料 */
  pair: AudienceOverlapPair;
  /** 花費資料 */
  spendData: SpendData;
  /** 執行排除回調 */
  onExecute?: (params: ExecuteExclusionParams) => Promise<void> | void;
  /** 忽略/關閉回調 */
  onDismiss?: () => void;
  /** 禁用執行按鈕 */
  disabled?: boolean;
  /** 預設展開詳細步驟 */
  defaultExpanded?: boolean;
}

/**
 * 優先級對應的樣式配置
 */
const priorityStyles: Record<ExclusionPriority, { badge: string; border: string; text: string }> = {
  none: { badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200', text: '無需處理' },
  low: { badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200', text: '低' },
  medium: { badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200', text: '中' },
  high: { badge: 'bg-red-100 text-red-700', border: 'border-red-200', text: '高' },
  critical: { badge: 'bg-red-200 text-red-800', border: 'border-red-300', text: '緊急' },
};

/**
 * 受眾排除建議元件
 *
 * 顯示基於重疊分析的排除建議，包含：
 * - 預估影響（節省金額、CPA 改善）
 * - 執行步驟
 * - 一鍵執行按鈕
 */
export function ExclusionSuggestion({
  pair,
  spendData,
  onExecute,
  onDismiss,
  disabled = false,
  defaultExpanded = true,
}: ExclusionSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isExecuting, setIsExecuting] = useState(false);

  // 產生排除建議
  const suggestion = useMemo(
    () => generateExclusionSuggestion(pair, spendData),
    [pair, spendData]
  );

  // 格式化影響摘要
  const formattedImpact = useMemo(
    () => formatImpactSummary(suggestion.impact),
    [suggestion.impact]
  );

  // 優先級樣式
  const priority = getExclusionPriority(pair.overlapPercentage);
  const styles = priorityStyles[priority];

  // 處理執行排除
  const handleExecute = useCallback(async () => {
    if (!onExecute || isExecuting) return;

    setIsExecuting(true);
    try {
      await onExecute({
        sourceAudienceId: suggestion.direction.sourceAudience.id,
        excludeAudienceId: suggestion.direction.excludeAudience.id,
        sourceAudienceName: suggestion.direction.sourceAudience.name,
        excludeAudienceName: suggestion.direction.excludeAudience.name,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [onExecute, suggestion.direction, isExecuting]);

  // 不需要排除時不渲染
  if (!suggestion.shouldExclude) {
    return null;
  }

  return (
    <article
      data-testid="exclusion-suggestion"
      role="article"
      className={`bg-white dark:bg-gray-800 rounded-lg border ${styles.border} p-4 shadow-sm`}
    >
      {/* 標題列 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            排除建議
          </h3>
          <span
            data-testid="priority-badge"
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.badge}`}
          >
            {styles.text}
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="關閉建議"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 受眾配對資訊 */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex-1 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">來源受眾</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {pair.audience1.name}
          </div>
          <div className="text-xs text-gray-400">
            {pair.audience1.size.toLocaleString()} 人
          </div>
        </div>
        <div className="flex flex-col items-center px-2">
          <ArrowRight className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            {pair.overlapPercentage}%
          </span>
        </div>
        <div className="flex-1 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">目標受眾</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {pair.audience2.name}
          </div>
          <div className="text-xs text-gray-400">
            {pair.audience2.size.toLocaleString()} 人
          </div>
        </div>
      </div>

      {/* 排除方向說明 */}
      <div
        data-testid="exclusion-direction"
        className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
      >
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
          <span>建議：在「{suggestion.direction.sourceAudience.name}」中排除「{suggestion.direction.excludeAudience.name}」</span>
        </div>
        <p
          data-testid="direction-reason"
          className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1"
        >
          {suggestion.direction.reason}
        </p>
      </div>

      {/* 預估影響 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <DollarSign className="w-5 h-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
          <div
            data-testid="estimated-savings"
            className="text-lg font-bold text-green-700 dark:text-green-300"
          >
            {formattedImpact.savings}
          </div>
          <div className="text-xs text-green-600/80 dark:text-green-400/80">預估每週節省</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <TrendingDown className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
          <div
            data-testid="cpa-improvement"
            className="text-lg font-bold text-purple-700 dark:text-purple-300"
          >
            {formattedImpact.cpaImprovement}
          </div>
          <div className="text-xs text-purple-600/80 dark:text-purple-400/80">預估 CPA 改善</div>
        </div>
        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <Percent className="w-5 h-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
          <div
            data-testid="overlap-reduction"
            className="text-lg font-bold text-orange-700 dark:text-orange-300"
          >
            {formattedImpact.overlapReduction}
          </div>
          <div className="text-xs text-orange-600/80 dark:text-orange-400/80">重疊減少</div>
        </div>
      </div>

      {/* 替代行動建議（如合併） */}
      {suggestion.alternativeAction && (
        <div
          data-testid="alternative-action"
          className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2"
        >
          <GitMerge className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-700 dark:text-amber-300">
              建議考慮：合併受眾
            </div>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
              {suggestion.alternativeReason}
            </p>
          </div>
        </div>
      )}

      {/* 詳細步驟（可收合） */}
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="查看詳細步驟"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <span>詳細步驟</span>
        </button>

        <div
          data-testid="action-steps"
          className={`mt-2 space-y-2 overflow-hidden transition-all duration-200 ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
          style={{ visibility: isExpanded ? 'visible' : 'hidden' }}
        >
          {suggestion.actionSteps.map((step, index) => (
            <div
              key={index}
              data-testid={`action-step-${index}`}
              className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
            >
              <span className="flex-shrink-0 w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <Button
          onClick={handleExecute}
          disabled={disabled || isExecuting}
          className="flex-1"
          aria-label="執行排除操作"
        >
          {isExecuting ? (
            <>
              <Loader2 data-testid="execute-loading" className="w-4 h-4 mr-2 animate-spin" />
              執行中...
            </>
          ) : (
            '執行排除'
          )}
        </Button>
        {onDismiss && (
          <Button
            variant="outline"
            onClick={onDismiss}
            disabled={isExecuting}
            aria-label="稍後處理"
          >
            稍後處理
          </Button>
        )}
      </div>
    </article>
  );
}
