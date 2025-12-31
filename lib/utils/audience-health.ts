/**
 * 受眾健康度計算模組
 *
 * 根據 specs/requirements.md 定義的公式計算受眾健康度
 *
 * 公式：健康度 = 規模(25%) + CPA表現(35%) + ROAS表現(25%) + 新鮮度(15%)
 *
 * 健康警示門檻：
 * - 🟢 健康 (70-100): 表現良好
 * - 🟡 注意 (40-69): 需要關注
 * - 🔴 問題 (0-39): 需要立即處理
 */

import type { AudienceHealthStatus } from '@/lib/api/types';

/**
 * 受眾健康計算輸入參數
 */
export interface AudienceHealthInput {
  /** 受眾規模 */
  size: number;
  /** 受眾 CPA */
  cpa: number;
  /** 帳戶平均 CPA */
  accountAvgCpa: number;
  /** 受眾 ROAS */
  roas: number;
  /** 距離上次更新天數 */
  daysSinceUpdate: number;
}

/**
 * 受眾健康計算結果
 */
export interface AudienceHealthResult {
  /** 健康分數 (0-100) */
  score: number;
  /** 健康狀態 */
  status: AudienceHealthStatus;
  /** 各因子分數明細 */
  breakdown: {
    sizeScore: number;
    cpaScore: number;
    roasScore: number;
    freshnessScore: number;
  };
}

// 權重常數
const WEIGHTS = {
  size: 0.25,
  cpa: 0.35,
  roas: 0.25,
  freshness: 0.15,
} as const;

// 門檻常數
const THRESHOLDS = {
  healthy: 70,
  warning: 40,
} as const;

// 規模閾值
const SIZE_THRESHOLDS = {
  minHealthy: 10_000,   // 10K
  maxHealthy: 2_000_000, // 2M
  minCritical: 5_000,   // 5K
  maxCritical: 10_000_000, // 10M
} as const;

// CPA 閾值（相對於帳戶平均）
const CPA_THRESHOLDS = {
  goodRatio: 1.0,    // 低於或等於平均
  warningRatio: 1.3, // 高於平均 30%
} as const;

// ROAS 閾值
const ROAS_THRESHOLDS = {
  healthy: 1.5, // > 1.5x
  warning: 1.0, // < 1.0x
} as const;

// 新鮮度閾值（天數）
const FRESHNESS_THRESHOLDS = {
  healthy: 30,
  warning: 60,
} as const;

/**
 * 計算受眾規模因子分數 (0-100)
 *
 * | 分數範圍 | 規模 |
 * |---------|------|
 * | 100     | 10K - 2M (理想範圍) |
 * | 50-99   | 5K-10K 或 2M-10M (可接受) |
 * | 0-49    | < 5K 或 > 10M (問題) |
 */
export function calculateSizeScore(size: number): number {
  const { minHealthy, maxHealthy, minCritical, maxCritical } = SIZE_THRESHOLDS;

  // 理想範圍
  if (size >= minHealthy && size <= maxHealthy) {
    return 100;
  }

  // 過小
  if (size < minHealthy) {
    if (size < minCritical) {
      // 極端過小：線性從 0 到 25
      return Math.max(0, (size / minCritical) * 25);
    }
    // 稍微過小：線性從 50 到 100
    return 50 + ((size - minCritical) / (minHealthy - minCritical)) * 50;
  }

  // 過大
  if (size > maxHealthy) {
    if (size > maxCritical) {
      // 極端過大：線性從 25 到 0
      return Math.max(0, 25 - ((size - maxCritical) / maxCritical) * 25);
    }
    // 稍微過大：線性從 100 到 50
    return 100 - ((size - maxHealthy) / (maxCritical - maxHealthy)) * 50;
  }

  return 50; // 預設
}

/**
 * 計算 CPA 表現因子分數 (0-100)
 *
 * | 分數範圍 | CPA 相對於平均 |
 * |---------|---------------|
 * | 100     | 低於平均     |
 * | 50-99   | 平均 ~ 平均+30% |
 * | 0-49    | 高於平均 30%+ |
 */
export function calculateCpaScore(cpa: number, accountAvgCpa: number): number {
  if (accountAvgCpa <= 0) {
    return 50; // 無法計算，返回中間值
  }

  const ratio = cpa / accountAvgCpa;

  if (ratio <= CPA_THRESHOLDS.goodRatio) {
    // CPA 低於或等於平均：滿分
    return 100;
  }

  if (ratio <= CPA_THRESHOLDS.warningRatio) {
    // CPA 高於平均但不超過 30%：線性從 100 到 50
    const excess = ratio - 1.0;
    return 100 - (excess / 0.3) * 50;
  }

  // CPA 高於平均 30% 以上：線性從 50 到 0
  const excess = ratio - 1.3;
  return Math.max(0, 50 - (excess / 0.7) * 50);
}

/**
 * 計算 ROAS 表現因子分數 (0-100)
 *
 * | 分數範圍 | ROAS |
 * |---------|------|
 * | 100     | >= 1.5x |
 * | 50-99   | 1.0x - 1.5x |
 * | 0-49    | < 1.0x |
 */
export function calculateRoasScore(roas: number): number {
  const { healthy, warning } = ROAS_THRESHOLDS;

  if (roas >= healthy) {
    return 100;
  }

  if (roas >= warning) {
    // ROAS 1.0-1.5：線性從 50 到 100
    return 50 + ((roas - warning) / (healthy - warning)) * 50;
  }

  // ROAS < 1.0：線性從 0 到 50
  if (roas <= 0) {
    return 0;
  }
  return (roas / warning) * 50;
}

/**
 * 計算新鮮度因子分數 (0-100)
 *
 * | 分數範圍 | 更新天數 |
 * |---------|---------|
 * | 100     | < 30 天 |
 * | 50-99   | 30-60 天 |
 * | 0-49    | > 60 天 |
 */
export function calculateFreshnessScore(daysSinceUpdate: number): number {
  const { healthy, warning } = FRESHNESS_THRESHOLDS;

  if (daysSinceUpdate <= healthy) {
    return 100;
  }

  if (daysSinceUpdate <= warning) {
    // 30-60 天：線性從 100 到 50
    return 100 - ((daysSinceUpdate - healthy) / (warning - healthy)) * 50;
  }

  // > 60 天：線性從 50 到 0
  return Math.max(0, 50 - ((daysSinceUpdate - warning) / warning) * 50);
}

/**
 * 根據分數取得健康狀態
 */
export function getAudienceHealthStatus(score: number): AudienceHealthStatus {
  if (score >= THRESHOLDS.healthy) return 'healthy';
  if (score >= THRESHOLDS.warning) return 'warning';
  return 'critical';
}

/**
 * 計算受眾健康度
 *
 * 根據四個因子計算加權平均健康分數
 *
 * @param input 健康計算輸入參數
 * @returns 健康計算結果，包含分數、狀態和明細
 *
 * @example
 * ```ts
 * const result = calculateAudienceHealth({
 *   size: 50_000,          // 受眾規模 5 萬
 *   cpa: 12.00,            // 受眾 CPA $12
 *   accountAvgCpa: 15.00,  // 帳戶平均 CPA $15
 *   roas: 2.5,             // ROAS 2.5x
 *   daysSinceUpdate: 15,   // 15 天前更新
 * });
 *
 * console.log(result.score);  // 100 (healthy)
 * console.log(result.status); // 'healthy'
 * ```
 */
export function calculateAudienceHealth(input: AudienceHealthInput): AudienceHealthResult {
  const sizeScore = calculateSizeScore(input.size);
  const cpaScore = calculateCpaScore(input.cpa, input.accountAvgCpa);
  const roasScore = calculateRoasScore(input.roas);
  const freshnessScore = calculateFreshnessScore(input.daysSinceUpdate);

  const score = Math.round(
    sizeScore * WEIGHTS.size +
    cpaScore * WEIGHTS.cpa +
    roasScore * WEIGHTS.roas +
    freshnessScore * WEIGHTS.freshness
  );

  return {
    score,
    status: getAudienceHealthStatus(score),
    breakdown: {
      sizeScore,
      cpaScore,
      roasScore,
      freshnessScore,
    },
  };
}

/**
 * 匯出門檻常數供 UI 使用
 */
export const AUDIENCE_HEALTH_THRESHOLDS = THRESHOLDS;
export const AUDIENCE_HEALTH_WEIGHTS = WEIGHTS;
