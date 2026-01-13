/**
 * 素材優化建議模組
 *
 * 根據疲勞因子分析產生優化建議
 * 遵循 specs/requirements.md 定義的門檻
 */

import type { CreativeFatigue, FatigueStatus } from '@/lib/api/types';

/**
 * 優化建議結構
 */
export interface OptimizationSuggestion {
  /** 建議圖示 emoji */
  icon: string;
  /** 建議標題 */
  title: string;
  /** 建議詳細說明 */
  description: string;
  /** 建議類型 */
  type: 'ctr' | 'frequency' | 'days' | 'general' | 'urgent';
}

/**
 * 因子門檻常數
 *
 * 參考 specs/requirements.md 第 4.1 節
 */
const THRESHOLDS = {
  /** CTR 變化達此值以下視為問題 */
  ctrChange: -15,
  /** 頻率達此值以上視為過高 */
  frequency: 4,
  /** 投放天數達此值以上視為過長 */
  daysActive: 30,
} as const;

/**
 * 產生 CTR 下降相關建議
 */
function getCtrSuggestion(ctrChange: number): OptimizationSuggestion | null {
  if (ctrChange >= THRESHOLDS.ctrChange) {
    return null;
  }

  return {
    icon: '🎨',
    title: '更新視覺素材',
    description: `CTR 下降 ${ctrChange}%，建議更換新的圖片或影片以吸引用戶注意力`,
    type: 'ctr',
  };
}

/**
 * 產生頻率過高相關建議
 */
function getFrequencySuggestion(frequency: number): OptimizationSuggestion | null {
  if (frequency < THRESHOLDS.frequency) {
    return null;
  }

  return {
    icon: '👥',
    title: '擴大受眾範圍',
    description: `平均曝光頻率 ${frequency} 次過高，建議擴大目標受眾或新增 Lookalike 受眾`,
    type: 'frequency',
  };
}

/**
 * 產生投放天數相關建議
 */
function getDaysSuggestion(daysActive: number): OptimizationSuggestion | null {
  if (daysActive < THRESHOLDS.daysActive) {
    return null;
  }

  return {
    icon: '🔄',
    title: '輪換素材',
    description: `素材已投放 ${daysActive} 天，建議輪換新素材以維持廣告新鮮度`,
    type: 'days',
  };
}

/**
 * 產生通用優化建議
 *
 * 當沒有特定因子達到門檻，但狀態為 warning 或 fatigued 時提供
 */
function getGeneralSuggestion(status: FatigueStatus): OptimizationSuggestion | null {
  if (status === 'healthy') {
    return null;
  }

  return {
    icon: '💡',
    title: '監控效能趨勢',
    description: '建議持續監控 CTR 和轉換率變化，並準備備用素材',
    type: 'general',
  };
}

/**
 * 產生緊急行動建議
 *
 * 當狀態為 fatigued 時提供
 */
function getUrgentSuggestion(status: FatigueStatus): OptimizationSuggestion | null {
  if (status !== 'fatigued') {
    return null;
  }

  return {
    icon: '⚠️',
    title: '暫停或替換素材',
    description: '素材疲勞嚴重，建議立即暫停並替換為新素材，避免持續浪費預算',
    type: 'urgent',
  };
}

/**
 * 根據疲勞度資訊產生優化建議
 *
 * 分析各個疲勞因子，產生對應的優化建議：
 * - CTR 下降 > 15%: 建議更新視覺
 * - 頻率 > 4: 建議擴大受眾
 * - 天數 > 30: 建議輪換素材
 * - fatigued 狀態: 建議暫停或替換
 *
 * @param fatigue 疲勞度資訊
 * @returns 優化建議陣列
 *
 * @example
 * ```ts
 * const suggestions = getOptimizationSuggestions({
 *   score: 65,
 *   status: 'warning',
 *   ctr_change: -20,
 *   frequency: 3.5,
 *   days_active: 21
 * });
 * // Returns: [{ icon: '🎨', title: '更新視覺素材', ... }]
 * ```
 */
export function getOptimizationSuggestions(
  fatigue: CreativeFatigue
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // 檢查各因子並產生對應建議
  const ctrSuggestion = getCtrSuggestion(fatigue.ctr_change);
  if (ctrSuggestion) {
    suggestions.push(ctrSuggestion);
  }

  const freqSuggestion = getFrequencySuggestion(fatigue.frequency);
  if (freqSuggestion) {
    suggestions.push(freqSuggestion);
  }

  const daysSuggestion = getDaysSuggestion(fatigue.days_active);
  if (daysSuggestion) {
    suggestions.push(daysSuggestion);
  }

  // 疲勞狀態加入緊急建議
  const urgentSuggestion = getUrgentSuggestion(fatigue.status);
  if (urgentSuggestion) {
    suggestions.push(urgentSuggestion);
  }

  // 如果沒有特定建議但狀態不佳，加入通用建議
  if (suggestions.length === 0 && fatigue.status !== 'healthy') {
    const generalSuggestion = getGeneralSuggestion(fatigue.status);
    if (generalSuggestion) {
      suggestions.push(generalSuggestion);
    }
  }

  return suggestions;
}

/**
 * 匯出門檻常數供其他模組使用
 */
export const OPTIMIZATION_THRESHOLDS = THRESHOLDS;
