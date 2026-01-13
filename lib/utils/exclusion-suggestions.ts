/**
 * 受眾排除建議工具函數
 *
 * A-005: Exclusion Suggestions
 * - 根據重疊分析建議排除受眾
 * - 計算排除後的預估影響
 * - 產生執行步驟指引
 */

import type { AudienceBase, AudienceOverlapPair } from './audience-overlap';

/**
 * 排除優先級
 */
export type ExclusionPriority = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * 排除方向 - 決定在哪個受眾中排除另一個
 */
export interface ExclusionDirection {
  /** 來源受眾（要保留的受眾） */
  sourceAudience: AudienceBase;
  /** 排除受眾（要從來源中排除的受眾） */
  excludeAudience: AudienceBase;
  /** 選擇原因 */
  reason: string;
}

/**
 * 預估影響
 */
export interface EstimatedImpact {
  /** 預估每週節省金額 (NT$) */
  estimatedSavings: number;
  /** 預估 CPA 改善百分比 */
  estimatedCPAImprovement: number;
  /** 重疊減少百分比 */
  overlapReduction: number;
  /** 資料是否可用 */
  dataAvailable: boolean;
}

/**
 * 格式化後的影響摘要
 */
export interface FormattedImpactSummary {
  /** 格式化的節省金額 */
  savings: string;
  /** 格式化的 CPA 改善 */
  cpaImprovement: string;
  /** 格式化的重疊減少 */
  overlapReduction: string;
}

/**
 * 排除建議
 */
export interface ExclusionSuggestion {
  /** 是否應該排除 */
  shouldExclude: boolean;
  /** 優先級 */
  priority: ExclusionPriority;
  /** 排除方向 */
  direction: ExclusionDirection;
  /** 預估影響 */
  impact: EstimatedImpact;
  /** 執行步驟 */
  actionSteps: string[];
  /** 原因說明 */
  reason: string;
  /** 替代行動（如合併） */
  alternativeAction?: 'merge' | 'monitor';
  /** 替代行動原因 */
  alternativeReason?: string;
}

/**
 * 花費資料
 */
export interface SpendData {
  audience1Spend?: number;
  audience2Spend?: number;
  audience1CPA?: number;
  audience2CPA?: number;
}

/**
 * 根據重疊百分比判斷排除優先級
 *
 * - none: < 20%，無需排除
 * - low: 20-30%，可考慮排除
 * - medium: 30-40%，建議排除
 * - high: 40-60%，強烈建議排除
 * - critical: > 60%，緊急處理
 */
export function getExclusionPriority(overlapPercentage: number): ExclusionPriority {
  if (overlapPercentage < 20) {
    return 'none';
  } else if (overlapPercentage < 30) {
    return 'low';
  } else if (overlapPercentage < 40) {
    return 'medium';
  } else if (overlapPercentage < 60) {
    return 'high';
  } else {
    return 'critical';
  }
}

/**
 * 決定排除方向
 *
 * 策略：
 * 1. 保留較大的受眾（觸及更多人）
 * 2. 從較大受眾中排除較小受眾
 * 3. 若大小相同，依 ID 排序選擇
 */
export function determineExclusionDirection(
  pair: AudienceOverlapPair
): ExclusionDirection {
  const { audience1, audience2 } = pair;

  // 比較受眾大小
  if (audience1.size > audience2.size) {
    return {
      sourceAudience: audience1,
      excludeAudience: audience2,
      reason: `在「${audience1.name}」中排除較小受眾「${audience2.name}」，保留較大的觸及規模`,
    };
  } else if (audience2.size > audience1.size) {
    return {
      sourceAudience: audience2,
      excludeAudience: audience1,
      reason: `在「${audience2.name}」中排除較小受眾「${audience1.name}」，保留較大的觸及規模`,
    };
  } else {
    // 大小相同時，用 ID 比較（確保一致性）
    if (audience1.id < audience2.id) {
      return {
        sourceAudience: audience1,
        excludeAudience: audience2,
        reason: `兩個受眾規模相同，建議在「${audience1.name}」中排除「${audience2.name}」`,
      };
    } else {
      return {
        sourceAudience: audience2,
        excludeAudience: audience1,
        reason: `兩個受眾規模相同，建議在「${audience2.name}」中排除「${audience1.name}」`,
      };
    }
  }
}

/**
 * 計算排除後的預估影響
 *
 * 預估節省 = 重疊比例 × 較小受眾花費
 * 預估 CPA 改善 = 預估節省 / 重疊人數 的 5-15%（經驗值）
 */
export function calculateEstimatedImpact(
  pair: AudienceOverlapPair,
  spendData: SpendData
): EstimatedImpact {
  const { overlapPercentage, overlapCount } = pair;
  const { audience1Spend, audience2Spend, audience1CPA, audience2CPA } = spendData;

  // 檢查資料可用性
  if (!audience1Spend && !audience2Spend) {
    return {
      estimatedSavings: 0,
      estimatedCPAImprovement: 0,
      overlapReduction: overlapPercentage,
      dataAvailable: false,
    };
  }

  // 計算節省金額
  // 預估節省 = 重疊比例 * 較小受眾花費
  const spend1 = audience1Spend || 0;
  const spend2 = audience2Spend || 0;
  const smallerSpend = Math.min(spend1, spend2);

  // 重疊部分的花費比例（保守估計）
  const overlapRatio = overlapPercentage / 100;
  let estimatedSavings = smallerSpend * overlapRatio;

  // 確保不超過較小受眾的全部花費
  estimatedSavings = Math.min(estimatedSavings, smallerSpend);

  // 計算 CPA 改善估計
  let estimatedCPAImprovement = 0;
  if (audience1CPA && audience2CPA && overlapCount > 0) {
    // 自我競爭通常會提高 CPA 5-15%
    // 排除後預估可節省這部分
    const avgCPA = (audience1CPA + audience2CPA) / 2;
    const competitionPenalty = avgCPA * 0.1; // 假設 10% 的競爭懲罰
    estimatedCPAImprovement = (competitionPenalty / avgCPA) * 100 * overlapRatio;
  }

  return {
    estimatedSavings: Math.round(estimatedSavings),
    estimatedCPAImprovement: Math.round(estimatedCPAImprovement * 10) / 10,
    overlapReduction: overlapPercentage,
    dataAvailable: true,
  };
}

/**
 * 格式化影響摘要
 */
export function formatImpactSummary(impact: EstimatedImpact): FormattedImpactSummary {
  if (!impact.dataAvailable) {
    return {
      savings: 'N/A',
      cpaImprovement: 'N/A',
      overlapReduction: `${impact.overlapReduction}%`,
    };
  }

  return {
    savings: `NT$${impact.estimatedSavings.toLocaleString('zh-TW')}`,
    cpaImprovement: impact.estimatedCPAImprovement > 0
      ? `-${impact.estimatedCPAImprovement}%`
      : '0%',
    overlapReduction: `${impact.overlapReduction}%`,
  };
}

/**
 * 產生排除建議
 */
export function generateExclusionSuggestion(
  pair: AudienceOverlapPair,
  spendData: SpendData
): ExclusionSuggestion {
  const priority = getExclusionPriority(pair.overlapPercentage);
  const direction = determineExclusionDirection(pair);
  const impact = calculateEstimatedImpact(pair, spendData);

  // 低重疊率，不建議排除
  if (priority === 'none') {
    return {
      shouldExclude: false,
      priority,
      direction,
      impact,
      actionSteps: [],
      reason: '重疊率低於 20%，無需排除操作',
    };
  }

  // 非常高重疊率，建議合併而非排除
  const alternativeAction = pair.overlapPercentage >= 70 ? 'merge' : undefined;
  const alternativeReason = alternativeAction === 'merge'
    ? '重疊率超過 70%，建議直接合併這兩個受眾以簡化管理'
    : undefined;

  // 產生執行步驟
  const actionSteps = [
    `編輯受眾「${direction.sourceAudience.name}」的目標設定`,
    `在「排除受眾」區塊新增「${direction.excludeAudience.name}」`,
    '儲存變更並等待系統更新（約 15-30 分鐘）',
    '觀察 2-3 天後的 CPA 變化',
  ];

  return {
    shouldExclude: true,
    priority,
    direction,
    impact,
    actionSteps,
    reason: `重疊率 ${pair.overlapPercentage}%，${direction.reason}`,
    alternativeAction,
    alternativeReason,
  };
}
