/**
 * 受眾擴展建議工具函數
 *
 * A-006: Expansion Suggestions
 * - AC1: 小受眾建議 Lookalike 擴展
 * - AC2: 顯示建議的相似度百分比
 * - AC3: 預估新增觸及數
 */

import type { Audience } from '../api/types';

/**
 * 擴展優先級
 */
export type ExpansionPriority = 'none' | 'low' | 'medium' | 'high';

/**
 * 預估觸及數據
 */
export interface EstimatedReach {
  /** 預估 Lookalike 受眾規模 */
  estimatedSize: number;
  /** 新增觸及人數（新規模 - 原始規模） */
  additionalReach: number;
  /** 成長倍數（新規模 / 原始規模） */
  growthMultiplier: number;
  /** 預估 CPA（通常比來源受眾略高） */
  estimatedCPA: number;
  /** 市場總規模（用於計算百分比） */
  marketSize: number;
}

/**
 * 格式化後的觸及摘要
 */
export interface FormattedReach {
  /** 格式化的預估規模 */
  size: string;
  /** 格式化的新增觸及 */
  additional: string;
  /** 格式化的成長倍數 */
  multiplier: string;
  /** 格式化的預估 CPA */
  cpa: string;
}

/**
 * Lookalike 設定
 */
export interface LookalikeConfig {
  /** 來源受眾 ID */
  sourceAudienceId: string;
  /** 建議的名稱 */
  suggestedName: string;
  /** 相似度百分比 (1-10) */
  similarityPercentage: number;
  /** 目標國家 */
  targetCountry: string;
  /** 預估規模 */
  estimatedSize: number;
}

/**
 * ROI 分析
 */
export interface ROIAnalysis {
  /** 潛在轉換數 */
  potentialConversions: number;
  /** 潛在收益 */
  potentialRevenue: number;
  /** 預估回本天數 */
  breakEvenDays: number;
}

/**
 * 擴展建議
 */
export interface ExpansionSuggestion {
  /** 是否建議擴展 */
  shouldExpand: boolean;
  /** 優先級 */
  priority: ExpansionPriority;
  /** 來源受眾 */
  sourceAudience: Audience;
  /** 建議的相似度百分比列表（依推薦順序） */
  recommendedPercentages: number[];
  /** 各百分比對應的預估觸及 */
  estimatedReachByPercentage: Record<number, EstimatedReach>;
  /** 執行步驟 */
  actionSteps: string[];
  /** 原因說明 */
  reason: string;
  /** ROI 分析（僅高優先級時提供） */
  roiAnalysis?: ROIAnalysis;
}

// 常數定義
const SMALL_AUDIENCE_THRESHOLD = 10000; // 小於 10,000 視為小受眾
const TAIWAN_MARKET_SIZE = 20000000; // 台灣市場約 2000 萬人

// 各百分比的 Lookalike 受眾預估規模（基於台灣市場）
const LOOKALIKE_SIZE_MULTIPLIERS: Record<number, number> = {
  1: 0.01, // 1% = 20萬人
  2: 0.02, // 2% = 40萬人
  3: 0.03, // 3% = 60萬人
  5: 0.05, // 5% = 100萬人
  10: 0.10, // 10% = 200萬人
};

// CPA 調整因子（相似度百分比越高，CPA 越高）
const CPA_ADJUSTMENT_FACTORS: Record<number, number> = {
  1: 1.15, // 1% Lookalike CPA 約增加 15%
  2: 1.25, // 2% Lookalike CPA 約增加 25%
  3: 1.35, // 3% Lookalike CPA 約增加 35%
  5: 1.50, // 5% Lookalike CPA 約增加 50%
  10: 1.80, // 10% Lookalike CPA 約增加 80%
};

/**
 * 判斷是否為小受眾（規模 < 10,000）
 *
 * @param audience - 受眾資料
 * @returns 是否為小受眾
 */
export function isSmallAudience(audience: Audience): boolean {
  return audience.size < SMALL_AUDIENCE_THRESHOLD;
}

/**
 * 取得擴展優先級
 *
 * 優先級判斷邏輯：
 * - 非小受眾或 Lookalike 類型 → none
 * - 高效能小受眾（ROAS >= 5 且 health_score >= 80） → high
 * - 中效能小受眾（ROAS >= 3 且 health_score >= 70） → medium
 * - 其他小受眾 → low
 *
 * @param audience - 受眾資料
 * @returns 擴展優先級
 */
export function getExpansionPriority(audience: Audience): ExpansionPriority {
  // Lookalike 本身已是擴展受眾，不需要再擴展
  if (audience.type === 'LOOKALIKE') {
    return 'none';
  }

  // 非小受眾不建議擴展
  if (!isSmallAudience(audience)) {
    return 'none';
  }

  const { roas } = audience.metrics;
  const { health_score } = audience;

  // 高效能小受眾
  if (roas >= 5 && health_score >= 80) {
    return 'high';
  }

  // 中效能小受眾
  if (roas >= 3 && health_score >= 70) {
    return 'medium';
  }

  // 低效能小受眾
  return 'low';
}

/**
 * 取得建議的相似度百分比列表
 *
 * 建議邏輯：
 * - 高效能受眾（ROAS >= 5）：建議 1-2%（更精準）
 * - 中效能受眾（ROAS >= 3）：建議 1-3%
 * - 其他受眾：建議 2-5%（觸及更多人）
 * - 非小受眾或 Lookalike：返回空陣列
 *
 * @param audience - 受眾資料
 * @returns 建議的相似度百分比列表（依推薦順序）
 */
export function getSuggestedSimilarityPercentages(audience: Audience): number[] {
  // Lookalike 或非小受眾不建議擴展
  if (audience.type === 'LOOKALIKE' || !isSmallAudience(audience)) {
    return [];
  }

  const { roas } = audience.metrics;

  // 高效能受眾：建議 1-2%
  if (roas >= 5) {
    return [1, 2];
  }

  // 中效能受眾：建議 1-3%
  if (roas >= 3) {
    return [1, 2, 3];
  }

  // 其他受眾：建議 2-3-5%
  return [2, 3, 5];
}

/**
 * 計算預估觸及數據
 *
 * @param audience - 來源受眾
 * @param similarityPercentage - 相似度百分比 (1-10)
 * @returns 預估觸及數據
 */
export function calculateEstimatedReach(
  audience: Audience,
  similarityPercentage: number
): EstimatedReach {
  const multiplier = LOOKALIKE_SIZE_MULTIPLIERS[similarityPercentage] || similarityPercentage / 100;
  const estimatedSize = Math.round(TAIWAN_MARKET_SIZE * multiplier);
  const additionalReach = estimatedSize - audience.size;
  const growthMultiplier = audience.size > 0 ? estimatedSize / audience.size : Infinity;

  const cpaFactor = CPA_ADJUSTMENT_FACTORS[similarityPercentage] || 1 + similarityPercentage * 0.08;
  const estimatedCPA = Math.round(audience.metrics.cpa * cpaFactor);

  return {
    estimatedSize,
    additionalReach,
    growthMultiplier,
    estimatedCPA,
    marketSize: TAIWAN_MARKET_SIZE,
  };
}

/**
 * 產生 Lookalike 設定
 *
 * @param audience - 來源受眾
 * @param similarityPercentage - 相似度百分比
 * @returns Lookalike 設定
 */
export function generateLookalikeConfig(
  audience: Audience,
  similarityPercentage: number
): LookalikeConfig {
  const reach = calculateEstimatedReach(audience, similarityPercentage);

  return {
    sourceAudienceId: audience.id,
    suggestedName: `Lookalike ${similarityPercentage}% - ${audience.name}`,
    similarityPercentage,
    targetCountry: 'TW',
    estimatedSize: reach.estimatedSize,
  };
}

/**
 * 格式化預估觸及數據
 *
 * @param reach - 預估觸及數據
 * @returns 格式化後的觸及摘要
 */
export function formatEstimatedReach(reach: EstimatedReach): FormattedReach {
  const formatNumber = (num: number) => num.toLocaleString('en-US');

  let multiplierStr: string;
  if (reach.growthMultiplier === Infinity) {
    multiplierStr = '∞';
  } else if (Number.isInteger(reach.growthMultiplier)) {
    multiplierStr = `${reach.growthMultiplier}x`;
  } else {
    multiplierStr = `${Math.round(reach.growthMultiplier * 10) / 10}x`;
  }

  return {
    size: formatNumber(reach.estimatedSize),
    additional: formatNumber(reach.additionalReach),
    multiplier: multiplierStr,
    cpa: `NT$${reach.estimatedCPA}`,
  };
}

/**
 * 產生擴展建議
 *
 * @param audience - 受眾資料
 * @returns 擴展建議
 */
export function generateExpansionSuggestion(audience: Audience): ExpansionSuggestion {
  const priority = getExpansionPriority(audience);
  const recommendedPercentages = getSuggestedSimilarityPercentages(audience);

  // 不建議擴展的情況
  if (priority === 'none') {
    let reason = '';
    if (audience.type === 'LOOKALIKE') {
      reason = '此受眾為 Lookalike 類型，已是擴展受眾，不需要再建立 Lookalike';
    } else {
      reason = `受眾規模 ${audience.size.toLocaleString()} 已足夠大，暫不需要建立 Lookalike 擴展`;
    }

    return {
      shouldExpand: false,
      priority: 'none',
      sourceAudience: audience,
      recommendedPercentages: [],
      estimatedReachByPercentage: {},
      actionSteps: [],
      reason,
    };
  }

  // 計算各百分比的預估觸及
  const estimatedReachByPercentage: Record<number, EstimatedReach> = {};
  recommendedPercentages.forEach((pct) => {
    estimatedReachByPercentage[pct] = calculateEstimatedReach(audience, pct);
  });

  // 產生執行步驟
  const primaryPct = recommendedPercentages[0];
  const reach = estimatedReachByPercentage[primaryPct];
  const actionSteps = [
    `在廣告管理員中選擇「建立受眾」→「Lookalike 受眾」`,
    `選擇「${audience.name}」作為來源受眾`,
    `選擇台灣作為目標地區`,
    `設定相似度為 ${primaryPct}%（預估規模約 ${reach.estimatedSize.toLocaleString()} 人）`,
    '儲存並等待受眾建立完成（約 24-48 小時）',
    '建立新廣告組合測試此 Lookalike 受眾',
  ];

  // 產生原因說明
  const reasonParts: string[] = [];
  reasonParts.push(`受眾「${audience.name}」規模較小（${audience.size.toLocaleString()} 人）`);

  if (audience.metrics.roas >= 5) {
    reasonParts.push(`且效能優異（ROAS ${audience.metrics.roas.toFixed(1)}）`);
  } else if (audience.metrics.roas >= 3) {
    reasonParts.push(`且效能良好（ROAS ${audience.metrics.roas.toFixed(1)}）`);
  }

  reasonParts.push(`建議建立 ${primaryPct}% Lookalike 受眾擴展觸及`);

  // 高優先級時提供 ROI 分析
  let roiAnalysis: ROIAnalysis | undefined;
  if (priority === 'high') {
    const conversionRate = audience.metrics.conversions / Math.max(audience.metrics.reach, 1);
    const potentialConversions = Math.round(reach.additionalReach * conversionRate * 0.7); // 保守估計 70%
    const avgOrderValue = audience.metrics.spend / Math.max(audience.metrics.conversions, 1) * audience.metrics.roas;
    const potentialRevenue = Math.round(potentialConversions * avgOrderValue);
    const estimatedSpend = potentialConversions * reach.estimatedCPA;
    const breakEvenDays = estimatedSpend > 0 ? Math.ceil(estimatedSpend / (audience.metrics.spend / 7)) : 0;

    roiAnalysis = {
      potentialConversions,
      potentialRevenue,
      breakEvenDays,
    };
  }

  return {
    shouldExpand: true,
    priority,
    sourceAudience: audience,
    recommendedPercentages,
    estimatedReachByPercentage,
    actionSteps,
    reason: reasonParts.join('，'),
    roiAnalysis,
  };
}
