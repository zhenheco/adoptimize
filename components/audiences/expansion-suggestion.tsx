'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  DollarSign,
  Target,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Audience } from '@/lib/api/types';
import {
  generateExpansionSuggestion,
  getExpansionPriority,
  formatEstimatedReach,
  type ExpansionPriority,
  type LookalikeConfig,
} from '@/lib/utils/expansion-suggestions';

/**
 * 建立 Lookalike 的參數
 */
export interface CreateLookalikeParams {
  sourceAudienceId: string;
  sourceAudienceName: string;
  similarityPercentage: number;
  suggestedName: string;
  targetCountry: string;
  estimatedSize: number;
}

/**
 * ExpansionSuggestion 元件屬性
 */
export interface ExpansionSuggestionProps {
  /** 來源受眾 */
  audience: Audience;
  /** 建立 Lookalike 回調 */
  onCreate?: (params: CreateLookalikeParams) => Promise<void> | void;
  /** 忽略/關閉回調 */
  onDismiss?: () => void;
  /** 禁用操作按鈕 */
  disabled?: boolean;
  /** 預設展開詳細步驟 */
  defaultExpanded?: boolean;
}

/**
 * 優先級對應的樣式配置
 */
const priorityStyles: Record<ExpansionPriority, { badge: string; border: string; text: string }> = {
  none: { badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200', text: '不需要' },
  low: { badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200', text: '低' },
  medium: { badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200', text: '中' },
  high: { badge: 'bg-green-100 text-green-700', border: 'border-green-200', text: '高' },
};

/**
 * 受眾擴展建議元件
 *
 * A-006: Expansion Suggestions
 * - AC1: 小受眾建議 Lookalike 擴展
 * - AC2: 顯示建議的相似度百分比
 * - AC3: 預估新增觸及數
 */
export function ExpansionSuggestion({
  audience,
  onCreate,
  onDismiss,
  disabled = false,
  defaultExpanded = true,
}: ExpansionSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);

  // 產生擴展建議
  const suggestion = useMemo(
    () => generateExpansionSuggestion(audience),
    [audience]
  );

  // 取得當前選擇的百分比（預設第一個）
  const currentPercentage = selectedPercentage ?? suggestion.recommendedPercentages[0];

  // 取得當前百分比的預估觸及
  const currentReach = suggestion.estimatedReachByPercentage[currentPercentage];
  const formattedReach = currentReach ? formatEstimatedReach(currentReach) : null;

  // 優先級樣式
  const priority = getExpansionPriority(audience);
  const styles = priorityStyles[priority];

  // 處理建立 Lookalike
  const handleCreate = useCallback(async () => {
    if (!onCreate || isCreating || !currentReach) return;

    setIsCreating(true);
    try {
      await onCreate({
        sourceAudienceId: audience.id,
        sourceAudienceName: audience.name,
        similarityPercentage: currentPercentage,
        suggestedName: `Lookalike ${currentPercentage}% - ${audience.name}`,
        targetCountry: 'TW',
        estimatedSize: currentReach.estimatedSize,
      });
    } finally {
      setIsCreating(false);
    }
  }, [onCreate, audience, currentPercentage, currentReach, isCreating]);

  // 不需要擴展時不渲染
  if (!suggestion.shouldExpand) {
    return null;
  }

  return (
    <article
      data-testid="expansion-suggestion"
      role="article"
      className={`bg-white dark:bg-gray-800 rounded-lg border ${styles.border} p-4 shadow-sm`}
    >
      {/* 標題列 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            擴展建議
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

      {/* 來源受眾資訊 */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">來源受眾</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {audience.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">目前規模</div>
            <div
              data-testid="current-size"
              className="font-bold text-gray-900 dark:text-white"
            >
              {audience.size.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 原因說明 */}
      <p
        data-testid="expansion-reason"
        className="mb-4 text-sm text-gray-600 dark:text-gray-300"
      >
        {suggestion.reason}
      </p>

      {/* 相似度百分比選擇 */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          建議相似度 <span data-testid="recommended-percentages" className="text-blue-600 dark:text-blue-400">
            ({suggestion.recommendedPercentages.map(p => `${p}%`).join(' / ')})
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {suggestion.recommendedPercentages.map((pct, index) => (
            <button
              key={pct}
              data-testid={`percentage-option-${pct}`}
              onClick={() => setSelectedPercentage(pct)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPercentage === pct
                  ? 'bg-blue-600 text-white selected'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {index === 0 && (
                <span
                  data-testid="primary-percentage"
                  className={currentPercentage === pct ? '' : 'sr-only'}
                >
                  {pct}%
                </span>
              )}
              {index !== 0 && `${pct}%`}
              {index === 0 && currentPercentage !== pct && `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      {/* 規模比較 */}
      {formattedReach && (
        <div
          data-testid="size-comparison"
          className="grid grid-cols-3 gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">目前規模</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {audience.size.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">擴展後規模</div>
            <div
              data-testid="estimated-size"
              className="text-lg font-bold text-blue-600 dark:text-blue-400"
            >
              {formattedReach.size}
            </div>
          </div>
        </div>
      )}

      {/* 預估數據 */}
      {formattedReach && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <TrendingUp className="w-5 h-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
            <div
              data-testid="additional-reach"
              className="text-lg font-bold text-green-700 dark:text-green-300"
            >
              +{formattedReach.additional}
            </div>
            <div className="text-xs text-green-600/80 dark:text-green-400/80">新增觸及</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Target className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
            <div
              data-testid="growth-multiplier"
              className="text-lg font-bold text-purple-700 dark:text-purple-300"
            >
              {formattedReach.multiplier}
            </div>
            <div className="text-xs text-purple-600/80 dark:text-purple-400/80">成長倍數</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <DollarSign className="w-5 h-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
            <div
              data-testid="estimated-cpa"
              className="text-lg font-bold text-orange-700 dark:text-orange-300"
            >
              {formattedReach.cpa}
            </div>
            <div className="text-xs text-orange-600/80 dark:text-orange-400/80">預估 CPA</div>
          </div>
        </div>
      )}

      {/* ROI 分析（僅高優先級） */}
      {suggestion.roiAnalysis && (
        <div
          data-testid="roi-analysis"
          className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
        >
          <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">
            ROI 預估分析
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div
                data-testid="potential-conversions"
                className="text-lg font-bold text-emerald-600 dark:text-emerald-400"
              >
                {suggestion.roiAnalysis.potentialConversions.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600/70">潛在轉換</div>
            </div>
            <div>
              <div
                data-testid="potential-revenue"
                className="text-lg font-bold text-emerald-600 dark:text-emerald-400"
              >
                NT${suggestion.roiAnalysis.potentialRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600/70">潛在收益</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {suggestion.roiAnalysis.breakEvenDays} 天
              </div>
              <div className="text-xs text-emerald-600/70">預估回本</div>
            </div>
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
          onClick={handleCreate}
          disabled={disabled || isCreating}
          className="flex-1"
          aria-label="建立 Lookalike 受眾"
        >
          {isCreating ? (
            <>
              <Loader2 data-testid="create-loading" className="w-4 h-4 mr-2 animate-spin" />
              建立中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              建立 Lookalike 受眾
            </>
          )}
        </Button>
        {onDismiss && (
          <Button
            variant="outline"
            onClick={onDismiss}
            disabled={isCreating}
            aria-label="稍後處理"
          >
            稍後處理
          </Button>
        )}
      </div>
    </article>
  );
}
