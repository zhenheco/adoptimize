/**
 * 帳戶健檢評分模組
 *
 * 根據 specs/requirements.md 定義的 5 維度評分系統
 *
 * 總分 = 結構(20%) + 素材(25%) + 受眾(25%) + 預算(20%) + 追蹤(10%)
 *
 * 健康分數等級：
 * - 🏆 優秀 (90-100): 帳戶狀態極佳
 * - ✅ 良好 (70-89): 有小問題需關注
 * - ⚠️ 需改善 (50-69): 多個問題需處理
 * - 🚨 危險 (0-49): 嚴重問題需立即處理
 */

import type { AuditGrade } from '@/lib/api/types';

/**
 * 健檢維度權重
 */
export const AUDIT_WEIGHTS = {
  structure: 0.20,
  creative: 0.25,
  audience: 0.25,
  budget: 0.20,
  tracking: 0.10,
} as const;

/**
 * 健檢等級門檻
 */
export const AUDIT_GRADE_THRESHOLDS = {
  excellent: 90,
  good: 70,
  needs_improvement: 50,
} as const;

/**
 * 問題嚴重程度
 */
export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 問題定義
 */
export interface AuditIssueDefinition {
  code: string;
  category: 'STRUCTURE' | 'CREATIVE' | 'AUDIENCE' | 'BUDGET' | 'TRACKING';
  severity: IssueSeverity;
  title: string;
  description: string;
  deduction: number;
}

/**
 * 維度評分輸入
 */
export interface DimensionScoreInput {
  baseScore: number;
  issues: AuditIssueDefinition[];
}

/**
 * 維度評分結果
 */
export interface DimensionScoreResult {
  score: number;
  weight: number;
  issues: number;
  deductions: number;
}

/**
 * 健檢評分輸入
 */
export interface AuditScoreInput {
  structure: DimensionScoreInput;
  creative: DimensionScoreInput;
  audience: DimensionScoreInput;
  budget: DimensionScoreInput;
  tracking: DimensionScoreInput;
}

/**
 * 健檢評分結果
 */
export interface AuditScoreResult {
  overallScore: number;
  grade: AuditGrade;
  dimensions: {
    structure: DimensionScoreResult;
    creative: DimensionScoreResult;
    audience: DimensionScoreResult;
    budget: DimensionScoreResult;
    tracking: DimensionScoreResult;
  };
  totalIssues: number;
}

// 預定義問題代碼（來自 specs/requirements.md）
export const STRUCTURE_ISSUES: Record<string, Omit<AuditIssueDefinition, 'code'>> = {
  POOR_NAMING: {
    category: 'STRUCTURE',
    severity: 'LOW',
    title: '廣告活動命名不清晰',
    description: '缺乏清晰的命名規則，難以識別和管理',
    deduction: 5,
  },
  TOO_FEW_ADSETS: {
    category: 'STRUCTURE',
    severity: 'MEDIUM',
    title: '廣告組數量過少',
    description: '每活動應有 3-10 個廣告組進行測試',
    deduction: 10,
  },
  TOO_MANY_ADSETS: {
    category: 'STRUCTURE',
    severity: 'MEDIUM',
    title: '廣告組數量過多',
    description: '每活動超過 10 個廣告組可能導致預算分散',
    deduction: 10,
  },
  WRONG_ADS_PER_ADSET: {
    category: 'STRUCTURE',
    severity: 'MEDIUM',
    title: '廣告組內廣告數量不當',
    description: '每組應有 3-6 則廣告進行 A/B 測試',
    deduction: 8,
  },
  MISSING_CONVERSION_TRACKING: {
    category: 'STRUCTURE',
    severity: 'HIGH',
    title: '轉換目標未設追蹤',
    description: '無法追蹤廣告效果，影響優化決策',
    deduction: 15,
  },
  AUDIENCE_COMPETITION: {
    category: 'STRUCTURE',
    severity: 'MEDIUM',
    title: '受眾競爭',
    description: '同受眾有多個廣告組競爭，可能導致自我競標',
    deduction: 12,
  },
};

export const CREATIVE_ISSUES: Record<string, Omit<AuditIssueDefinition, 'code'>> = {
  LOW_VARIETY: {
    category: 'CREATIVE',
    severity: 'MEDIUM',
    title: '素材多樣性不足',
    description: '應使用 3 種以上素材類型',
    deduction: 10,
  },
  CREATIVE_FATIGUE: {
    category: 'CREATIVE',
    severity: 'HIGH',
    title: '素材疲勞',
    description: 'CTR 週降幅超過 15%，素材效果下降',
    deduction: 12,
  },
  HIGH_FREQUENCY: {
    category: 'CREATIVE',
    severity: 'MEDIUM',
    title: '投放頻率過高',
    description: '頻率超過 3 次，受眾可能產生廣告疲勞',
    deduction: 8,
  },
  STALE_CREATIVE: {
    category: 'CREATIVE',
    severity: 'MEDIUM',
    title: '素材過時',
    description: '超過 30 天未更新素材',
    deduction: 10,
  },
  TRUNCATED_COPY: {
    category: 'CREATIVE',
    severity: 'LOW',
    title: '文案被截斷',
    description: '標題過長被截斷，影響訊息傳達',
    deduction: 5,
  },
};

export const AUDIENCE_ISSUES: Record<string, Omit<AuditIssueDefinition, 'code'>> = {
  SIZE_TOO_SMALL: {
    category: 'AUDIENCE',
    severity: 'MEDIUM',
    title: '受眾規模過小',
    description: '受眾規模低於 10K，可能限制投放',
    deduction: 10,
  },
  SIZE_TOO_LARGE: {
    category: 'AUDIENCE',
    severity: 'LOW',
    title: '受眾規模過大',
    description: '受眾規模超過 2M，可能不夠精準',
    deduction: 5,
  },
  HIGH_OVERLAP: {
    category: 'AUDIENCE',
    severity: 'HIGH',
    title: '受眾重疊率高',
    description: '受眾重疊率超過 20%，可能自我競爭',
    deduction: 12,
  },
  NO_EXCLUSION: {
    category: 'AUDIENCE',
    severity: 'HIGH',
    title: '未排除已購買者',
    description: '未設定排除已購買受眾，浪費預算',
    deduction: 15,
  },
  POOR_LOOKALIKE_SOURCE: {
    category: 'AUDIENCE',
    severity: 'MEDIUM',
    title: 'Lookalike 來源品質不佳',
    description: 'Lookalike 應基於購買者而非訪客',
    deduction: 8,
  },
  STALE_AUDIENCE: {
    category: 'AUDIENCE',
    severity: 'MEDIUM',
    title: '受眾過時',
    description: '受眾超過 30 天未更新',
    deduction: 10,
  },
};

export const BUDGET_ISSUES: Record<string, Omit<AuditIssueDefinition, 'code'>> = {
  INEFFICIENT_ALLOCATION: {
    category: 'BUDGET',
    severity: 'HIGH',
    title: '預算分配低效',
    description: '低效活動佔比超過 30%',
    deduction: 15,
  },
  LOW_SPEND_RATE: {
    category: 'BUDGET',
    severity: 'MEDIUM',
    title: '預算消耗率低',
    description: '預算消耗低於 80%，未充分利用',
    deduction: 10,
  },
  OVERSPEND: {
    category: 'BUDGET',
    severity: 'MEDIUM',
    title: '預算超支',
    description: '預算消耗超過 100%',
    deduction: 10,
  },
  LEARNING_PHASE_BUDGET: {
    category: 'BUDGET',
    severity: 'HIGH',
    title: '學習期預算不足',
    description: '預算不足以達到每天 10 次轉換',
    deduction: 12,
  },
  WRONG_BID_STRATEGY: {
    category: 'BUDGET',
    severity: 'MEDIUM',
    title: '出價策略不符',
    description: '出價策略與目標不匹配',
    deduction: 10,
  },
};

export const TRACKING_ISSUES: Record<string, Omit<AuditIssueDefinition, 'code'>> = {
  NO_CONVERSION_TRACKING: {
    category: 'TRACKING',
    severity: 'CRITICAL',
    title: '未設定轉換追蹤',
    description: '缺少轉換追蹤，無法衡量廣告效果',
    deduction: 20,
  },
  PIXEL_NOT_FIRING: {
    category: 'TRACKING',
    severity: 'CRITICAL',
    title: 'Pixel 未觸發',
    description: 'Pixel 未正常觸發，無法收集數據',
    deduction: 18,
  },
  INCOMPLETE_FUNNEL: {
    category: 'TRACKING',
    severity: 'MEDIUM',
    title: '漏斗追蹤不完整',
    description: '未追蹤完整漏斗事件',
    deduction: 10,
  },
  MISSING_UTM: {
    category: 'TRACKING',
    severity: 'LOW',
    title: '缺少 UTM 參數',
    description: '缺少一致的 UTM 標記',
    deduction: 8,
  },
};

/**
 * 計算維度分數
 *
 * 從 100 分開始，根據問題扣分
 */
export function calculateDimensionScore(
  input: DimensionScoreInput,
  weight: number
): DimensionScoreResult {
  const deductions = input.issues.reduce((sum, issue) => sum + issue.deduction, 0);
  const score = Math.max(0, input.baseScore - deductions);

  return {
    score,
    weight,
    issues: input.issues.length,
    deductions,
  };
}

/**
 * 根據分數取得健檢等級
 */
export function getAuditGrade(score: number): AuditGrade {
  if (score >= AUDIT_GRADE_THRESHOLDS.excellent) return 'excellent';
  if (score >= AUDIT_GRADE_THRESHOLDS.good) return 'good';
  if (score >= AUDIT_GRADE_THRESHOLDS.needs_improvement) return 'needs_improvement';
  return 'critical';
}

/**
 * 計算健檢總分
 *
 * 根據五個維度的加權平均計算
 *
 * @param input 各維度評分輸入
 * @returns 健檢評分結果
 *
 * @example
 * ```ts
 * const result = calculateAuditScore({
 *   structure: { baseScore: 100, issues: [STRUCTURE_ISSUES.POOR_NAMING] },
 *   creative: { baseScore: 100, issues: [] },
 *   audience: { baseScore: 100, issues: [] },
 *   budget: { baseScore: 100, issues: [] },
 *   tracking: { baseScore: 100, issues: [] },
 * });
 *
 * console.log(result.overallScore); // 99 (只有一個 5 分扣分)
 * console.log(result.grade); // 'excellent'
 * ```
 */
export function calculateAuditScore(input: AuditScoreInput): AuditScoreResult {
  const structure = calculateDimensionScore(input.structure, AUDIT_WEIGHTS.structure);
  const creative = calculateDimensionScore(input.creative, AUDIT_WEIGHTS.creative);
  const audience = calculateDimensionScore(input.audience, AUDIT_WEIGHTS.audience);
  const budget = calculateDimensionScore(input.budget, AUDIT_WEIGHTS.budget);
  const tracking = calculateDimensionScore(input.tracking, AUDIT_WEIGHTS.tracking);

  const overallScore = Math.round(
    structure.score * structure.weight +
    creative.score * creative.weight +
    audience.score * audience.weight +
    budget.score * budget.weight +
    tracking.score * tracking.weight
  );

  const totalIssues =
    structure.issues + creative.issues + audience.issues + budget.issues + tracking.issues;

  return {
    overallScore,
    grade: getAuditGrade(overallScore),
    dimensions: {
      structure,
      creative,
      audience,
      budget,
      tracking,
    },
    totalIssues,
  };
}

/**
 * 建立問題物件
 *
 * 輔助函數，用於從預定義問題建立完整問題物件
 */
export function createIssue(
  code: string,
  definition: Omit<AuditIssueDefinition, 'code'>
): AuditIssueDefinition {
  return {
    code,
    ...definition,
  };
}
