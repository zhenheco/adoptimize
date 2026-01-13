'use client';

import { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ObjectiveSelector } from './objective-selector';
import { IndustrySelector } from './industry-selector';
import { SuggestionResult } from './suggestion-result';
import { useSuggestionOptions } from '@/hooks/use-suggestion-options';
import { useSuggestionLimit } from '@/hooks/use-suggestion-limit';
import { useSuggestions } from '@/hooks/use-suggestions';
import { useCreateMetaAudience } from '@/hooks/use-create-meta-audience';
import { useCreateMetaAd } from '@/hooks/use-create-meta-ad';
import type { AudienceSuggestion } from '@/lib/api/types';

/**
 * 向導步驟
 */
type WizardStep = 'objective' | 'industry' | 'generating' | 'result';

interface SuggestionWizardProps {
  userId: string;
  accountId: string;
}

/**
 * 智慧受眾建議向導
 *
 * 引導用戶選擇目標和產業，生成 AI 建議
 */
export function SuggestionWizard({ userId, accountId }: SuggestionWizardProps) {
  // 狀態管理
  const [step, setStep] = useState<WizardStep>('objective');
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState<AudienceSuggestion | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Hooks
  const { options, isLoading: isLoadingOptions, error: optionsError } = useSuggestionOptions();
  const { limit, isLoading: isLoadingLimit, refetch: refetchLimit } = useSuggestionLimit(userId);
  const { generateSuggestion } = useSuggestions(userId, { accountId });
  const { createAudience, isLoading: isCreatingAudience } = useCreateMetaAudience(userId);
  const { createAd, isLoading: isCreatingAd } = useCreateMetaAd(userId);

  // 重置向導
  const resetWizard = () => {
    setStep('objective');
    setSelectedObjective(null);
    setSelectedIndustry(null);
    setCurrentSuggestion(null);
    setGenerateError(null);
  };

  // 處理生成建議
  const handleGenerate = async () => {
    if (!selectedObjective || !selectedIndustry) return;

    setStep('generating');
    setGenerateError(null);

    try {
      const suggestion = await generateSuggestion({
        account_id: accountId,
        industry_code: selectedIndustry,
        objective_code: selectedObjective,
      });
      setCurrentSuggestion(suggestion);
      setStep('result');
      // 重新獲取限制資訊
      refetchLimit();
    } catch (err) {
      const error = err as Error & { code?: string };
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        setGenerateError('本月建議次數已達上限，請升級方案或等待下個月重置');
      } else {
        setGenerateError(error.message || '生成建議時發生錯誤');
      }
      setStep('industry'); // 返回上一步
    }
  };

  // 處理建立受眾
  const handleCreateAudience = async () => {
    if (!currentSuggestion) return;

    try {
      const response = await createAudience(currentSuggestion.id);
      // 更新建議狀態
      setCurrentSuggestion({
        ...currentSuggestion,
        meta_audience_id: response.meta_audience_id,
        status: 'saved',
      });
    } catch (err) {
      console.error('建立受眾失敗:', err);
    }
  };

  // 處理建立廣告
  const handleCreateAd = async () => {
    if (!currentSuggestion) return;

    try {
      // 這裡需要先選擇 Campaign，暫時使用預設值
      const response = await createAd(currentSuggestion.id, {
        campaign_id: '', // TODO: 讓用戶選擇 Campaign
        daily_budget: 500,
        use_suggested_copy: true,
      });
      // 更新建議狀態
      setCurrentSuggestion({
        ...currentSuggestion,
        meta_adset_id: response.meta_adset_id,
        meta_ad_id: response.meta_ad_id,
        status: 'executed',
      });
    } catch (err) {
      console.error('建立廣告失敗:', err);
    }
  };

  // 載入狀態
  if (isLoadingOptions || isLoadingLimit) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">載入中...</span>
      </div>
    );
  }

  // 錯誤狀態
  if (optionsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>載入選項時發生錯誤: {optionsError.message}</span>
        </div>
      </div>
    );
  }

  // 檢查是否可以生成
  const canGenerate = limit?.can_generate ?? false;

  return (
    <div className="space-y-6">
      {/* 標題與限制資訊 */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            智慧受眾建議
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI 根據您的目標和產業生成最佳興趣標籤組合
          </p>
        </div>

        {limit && (
          <div className="text-right text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              本月剩餘次數：
              <span
                className={`font-medium ml-1 ${
                  (limit.remaining_suggestions ?? 0) > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {limit.remaining_suggestions ?? 0}
                {limit.limit && ` / ${limit.limit}`}
              </span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {limit.message}
            </div>
          </div>
        )}
      </div>

      {/* 步驟進度 */}
      {step !== 'result' && (
        <div className="flex items-center gap-2">
          <StepIndicator
            number={1}
            label="選擇目標"
            isActive={step === 'objective'}
            isCompleted={step === 'industry' || step === 'generating'}
          />
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <StepIndicator
            number={2}
            label="選擇產業"
            isActive={step === 'industry'}
            isCompleted={step === 'generating'}
          />
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <StepIndicator
            number={3}
            label="生成建議"
            isActive={step === 'generating'}
            isCompleted={false}
          />
        </div>
      )}

      {/* 生成錯誤 */}
      {generateError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{generateError}</span>
          </div>
        </div>
      )}

      {/* 步驟內容 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* 步驟 1: 選擇目標 */}
        {step === 'objective' && options && (
          <ObjectiveSelector
            objectives={options.objectives}
            selectedCode={selectedObjective}
            onSelect={setSelectedObjective}
          />
        )}

        {/* 步驟 2: 選擇產業 */}
        {step === 'industry' && options && (
          <IndustrySelector
            industries={options.industries}
            selectedCode={selectedIndustry}
            onSelect={setSelectedIndustry}
          />
        )}

        {/* 步驟 3: 生成中 */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              AI 正在分析您的需求...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
              根據您選擇的「{options?.objectives.find((o) => o.code === selectedObjective)?.name}」
              目標和「{options?.industries.find((i) => i.code === selectedIndustry)?.name}」
              產業，正在生成最佳興趣標籤組合
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mt-4" />
          </div>
        )}

        {/* 步驟 4: 結果 */}
        {step === 'result' && currentSuggestion && (
          <SuggestionResult
            suggestion={currentSuggestion}
            onCreateAudience={handleCreateAudience}
            onCreateAd={handleCreateAd}
            isCreatingAudience={isCreatingAudience}
            isCreatingAd={isCreatingAd}
          />
        )}
      </div>

      {/* 導航按鈕 */}
      <div className="flex items-center justify-between">
        {/* 返回按鈕 */}
        {step === 'industry' && (
          <Button variant="outline" onClick={() => setStep('objective')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        )}
        {step === 'result' && (
          <Button variant="outline" onClick={resetWizard}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重新開始
          </Button>
        )}
        {step === 'objective' && <div />}

        {/* 下一步按鈕 */}
        {step === 'objective' && (
          <Button onClick={() => setStep('industry')} disabled={!selectedObjective}>
            下一步
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        {step === 'industry' && (
          <Button
            onClick={handleGenerate}
            disabled={!selectedIndustry || !canGenerate}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            生成 AI 建議
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 取得步驟指示器的樣式
 */
function getStepIndicatorStyle(isCompleted: boolean, isActive: boolean): string {
  if (isCompleted) {
    return 'bg-green-500 text-white';
  }
  if (isActive) {
    return 'bg-blue-600 text-white';
  }
  return 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
}

/**
 * 步驟指示器
 */
function StepIndicator({
  number,
  label,
  isActive,
  isCompleted,
}: {
  number: number;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}) {
  const indicatorStyle = getStepIndicatorStyle(isCompleted, isActive);
  const labelStyle = isActive
    ? 'text-gray-900 dark:text-white font-medium'
    : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${indicatorStyle}`}>
        {isCompleted ? '✓' : number}
      </div>
      <span className={`text-sm hidden sm:inline ${labelStyle}`}>
        {label}
      </span>
    </div>
  );
}
