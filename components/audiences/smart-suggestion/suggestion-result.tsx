'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Users,
  DollarSign,
  TrendingUp,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AudienceSuggestion, SuggestedInterest } from '@/lib/api/types';

interface SuggestionResultProps {
  suggestion: AudienceSuggestion;
  onCreateAudience?: () => void;
  onCreateAd?: () => void;
  isCreatingAudience?: boolean;
  isCreatingAd?: boolean;
}

/**
 * 取得相關性分數的樣式
 */
function getRelevanceScoreStyle(score: number): string {
  if (score >= 80) {
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  }
  if (score >= 60) {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
  }
  return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
}

/**
 * 取得信心分數的樣式
 */
function getConfidenceScoreStyle(score: number): string {
  if (score >= 80) {
    return 'text-green-600 dark:text-green-400';
  }
  if (score >= 60) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  return 'text-gray-600 dark:text-gray-400';
}

/**
 * 興趣標籤卡片
 */
function InterestTag({
  interest,
  index,
  isHidden = false,
}: {
  interest: SuggestedInterest;
  index: number;
  isHidden?: boolean;
}) {
  const [showReason, setShowReason] = useState(false);

  if (isHidden) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 opacity-50">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">升級以查看更多標籤</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              #{index + 1}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {interest.name_zh}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {interest.name}
          </div>
        </div>
        <div
          className={`
            px-2 py-0.5 rounded-full text-xs font-medium
            ${getRelevanceScoreStyle(interest.relevance_score)}
          `}
        >
          {interest.relevance_score}%
        </div>
      </div>

      {/* 預估觸及 */}
      {interest.estimated_reach && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <Users className="w-3 h-3" />
          <span>預估觸及: {(interest.estimated_reach / 1000000).toFixed(1)}M</span>
        </div>
      )}

      {/* 推薦原因 */}
      <button
        onClick={() => setShowReason(!showReason)}
        className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        {showReason ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        <span>{showReason ? '隱藏原因' : '查看推薦原因'}</span>
      </button>
      {showReason && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
          {interest.reason}
        </p>
      )}
    </div>
  );
}

/**
 * 智慧建議結果展示
 *
 * 顯示 AI 生成的興趣標籤和建議
 */
export function SuggestionResult({
  suggestion,
  onCreateAudience,
  onCreateAd,
  isCreatingAudience = false,
  isCreatingAd = false,
}: SuggestionResultProps) {
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  // 計算可見和隱藏的興趣標籤
  const visibleInterests = suggestion.can_view_full
    ? suggestion.suggested_interests
    : suggestion.suggested_interests.slice(0, 2);
  const hiddenCount = suggestion.hidden_interests_count || 0;

  // 複製興趣標籤清單
  const handleCopyInterests = () => {
    const text = suggestion.suggested_interests
      .map((i) => `${i.name_zh} (${i.name})`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* 成功標題 */}
      <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            AI 建議生成完成！
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400">
            已根據您的目標和產業生成 {suggestion.suggested_interests.length} 個推薦興趣標籤
          </p>
        </div>
      </div>

      {/* 預估指標 */}
      {(suggestion.estimated_reach_lower || suggestion.estimated_cpa || suggestion.estimated_roas) && (
        <div className="grid grid-cols-3 gap-4">
          {suggestion.estimated_reach_lower && suggestion.estimated_reach_upper && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <div className="text-xs text-blue-600 dark:text-blue-400">預估觸及</div>
              <div className="font-semibold text-blue-800 dark:text-blue-200">
                {(suggestion.estimated_reach_lower / 1000000).toFixed(1)}M -{' '}
                {(suggestion.estimated_reach_upper / 1000000).toFixed(1)}M
              </div>
            </div>
          )}
          {suggestion.estimated_cpa && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
              <div className="text-xs text-green-600 dark:text-green-400">預估 CPA</div>
              <div className="font-semibold text-green-800 dark:text-green-200">
                NT${suggestion.estimated_cpa.toLocaleString()}
              </div>
            </div>
          )}
          {suggestion.estimated_roas && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <div className="text-xs text-purple-600 dark:text-purple-400">預估 ROAS</div>
              <div className="font-semibold text-purple-800 dark:text-purple-200">
                {suggestion.estimated_roas.toFixed(2)}x
              </div>
            </div>
          )}
        </div>
      )}

      {/* 信心分數 */}
      {suggestion.confidence_score && (
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-600 dark:text-gray-400">
            AI 信心分數：
            <span className={`font-medium ml-1 ${getConfidenceScoreStyle(suggestion.confidence_score)}`}>
              {suggestion.confidence_score}%
            </span>
          </span>
        </div>
      )}

      {/* 推薦興趣標籤 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            推薦興趣標籤 ({suggestion.suggested_interests.length})
          </h4>
          {suggestion.can_view_full && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyInterests}
              className="text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              複製清單
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(showAllInterests ? visibleInterests : visibleInterests.slice(0, 4)).map(
            (interest, index) => (
              <InterestTag key={interest.meta_interest_id} interest={interest} index={index} />
            )
          )}
          {/* 隱藏的標籤預覽 */}
          {hiddenCount > 0 &&
            Array.from({ length: Math.min(hiddenCount, 2) }).map((_, i) => (
              <InterestTag
                key={`hidden-${i}`}
                interest={{
                  meta_interest_id: '',
                  name: '',
                  name_zh: '',
                  relevance_score: 0,
                  reason: '',
                }}
                index={visibleInterests.length + i}
                isHidden
              />
            ))}
        </div>

        {/* 展開/收起按鈕 */}
        {visibleInterests.length > 4 && (
          <button
            onClick={() => setShowAllInterests(!showAllInterests)}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mx-auto"
          >
            {showAllInterests ? (
              <>
                <ChevronUp className="w-4 h-4" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                查看全部 {visibleInterests.length} 個標籤
              </>
            )}
          </button>
        )}
      </div>

      {/* AI 推薦理由 */}
      {suggestion.reasoning && suggestion.can_view_full && (
        <div className="space-y-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
            AI 推薦理由
            {showReasoning ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showReasoning && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {suggestion.reasoning}
            </div>
          )}
        </div>
      )}

      {/* 建議廣告文案 */}
      {suggestion.suggested_ad_copy && suggestion.can_view_full && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            建議廣告文案
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
            &ldquo;{suggestion.suggested_ad_copy}&rdquo;
          </p>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {suggestion.can_create_audience ? (
          <Button
            onClick={onCreateAudience}
            disabled={isCreatingAudience || !!suggestion.meta_audience_id}
            className="flex-1"
          >
            {isCreatingAudience ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                建立中...
              </>
            ) : suggestion.meta_audience_id ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                已建立受眾
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                一鍵建立 Meta 受眾
              </>
            )}
          </Button>
        ) : (
          <Button disabled className="flex-1 opacity-50">
            <Lock className="w-4 h-4 mr-2" />
            升級至 Professional 以建立受眾
          </Button>
        )}

        {suggestion.can_create_ad ? (
          <Button
            onClick={onCreateAd}
            disabled={isCreatingAd || !!suggestion.meta_ad_id || !suggestion.meta_audience_id}
            variant="outline"
            className="flex-1"
          >
            {isCreatingAd ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                建立中...
              </>
            ) : suggestion.meta_ad_id ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                已建立廣告
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                一鍵建立廣告
              </>
            )}
          </Button>
        ) : (
          <Button disabled variant="outline" className="flex-1 opacity-50">
            <Lock className="w-4 h-4 mr-2" />
            升級至 Agency 以建立廣告
          </Button>
        )}
      </div>
    </div>
  );
}
