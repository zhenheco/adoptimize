/**
 * 素材疲勞度計算模組
 *
 * 根據 specs/requirements.md 定義的公式計算素材疲勞度
 *
 * 公式：疲勞度 = CTR變化權重(40%) + 投放頻率權重(30%) + 投放天數權重(20%) + 轉換率變化權重(10%)
 *
 * 疲勞警示門檻：
 * - 🟢 健康 (0-40): 持續投放
 * - 🟡 注意 (41-70): 準備替換素材
 * - 🔴 疲勞 (71-100): 立即更換素材
 */

import type { FatigueStatus } from '@/lib/api/types';

/**
 * 疲勞計算輸入參數
 */
export interface FatigueInput {
  /** CTR 變化率（%），負值表示下降 */
  ctrChange: number;
  /** 平均投放頻率（次/人） */
  frequency: number;
  /** 投放天數 */
  daysActive: number;
  /** 轉換率變化率（%），負值表示下降 */
  conversionRateChange: number;
}

/**
 * 疲勞計算結果
 */
export interface FatigueResult {
  /** 疲勞分數 (0-100) */
  score: number;
  /** 疲勞狀態 */
  status: FatigueStatus;
  /** 各因子分數明細 */
  breakdown: {
    ctrScore: number;
    frequencyScore: number;
    daysScore: number;
    conversionScore: number;
  };
}

// 權重常數
const WEIGHTS = {
  ctr: 0.4,
  frequency: 0.3,
  days: 0.2,
  conversion: 0.1,
} as const;

// 門檻常數
const THRESHOLDS = {
  healthy: 40,
  warning: 70,
} as const;

/**
 * 計算 CTR 變化因子分數 (0-100)
 *
 * | 分數範圍 | CTR 變化 |
 * |---------|----------|
 * | 0-25    | > 0%     |
 * | 26-50   | 0% ~ -10%|
 * | 51-75   | -10% ~ -20%|
 * | 76-100  | < -20%   |
 */
export function calculateCtrScore(ctrChange: number): number {
  if (ctrChange > 0) return 0;
  if (ctrChange >= -10) return 25 + ((-ctrChange) / 10) * 25;
  if (ctrChange >= -20) return 50 + ((- ctrChange - 10) / 10) * 25;
  return Math.min(100, 75 + ((-ctrChange - 20) / 10) * 25);
}

/**
 * 計算投放頻率因子分數 (0-100)
 *
 * | 分數範圍 | 頻率 |
 * |---------|------|
 * | 0-25    | < 2  |
 * | 26-50   | 2-3  |
 * | 51-75   | 3-4  |
 * | 76-100  | > 4  |
 */
export function calculateFrequencyScore(frequency: number): number {
  if (frequency < 2) return (frequency / 2) * 25;
  if (frequency < 3) return 25 + ((frequency - 2) / 1) * 25;
  if (frequency < 4) return 50 + ((frequency - 3) / 1) * 25;
  return Math.min(100, 75 + ((frequency - 4) / 2) * 25);
}

/**
 * 計算投放天數因子分數 (0-100)
 *
 * | 分數範圍 | 天數 |
 * |---------|------|
 * | 0-25    | < 7 天 |
 * | 26-50   | 7-14 天 |
 * | 51-75   | 14-30 天 |
 * | 76-100  | > 30 天 |
 */
export function calculateDaysScore(daysActive: number): number {
  if (daysActive < 7) return (daysActive / 7) * 25;
  if (daysActive < 14) return 25 + ((daysActive - 7) / 7) * 25;
  if (daysActive < 30) return 50 + ((daysActive - 14) / 16) * 25;
  return Math.min(100, 75 + ((daysActive - 30) / 30) * 25);
}

/**
 * 計算轉換率變化因子分數 (0-100)
 *
 * | 分數範圍 | 轉換率變化 |
 * |---------|----------|
 * | 0-25    | > 0%     |
 * | 26-50   | 0% ~ -10%|
 * | 51-75   | -10% ~ -20%|
 * | 76-100  | < -20%   |
 */
export function calculateConversionScore(conversionRateChange: number): number {
  if (conversionRateChange > 0) return 0;
  if (conversionRateChange >= -10) return 25 + ((-conversionRateChange) / 10) * 25;
  if (conversionRateChange >= -20) return 50 + ((-conversionRateChange - 10) / 10) * 25;
  return Math.min(100, 75 + ((-conversionRateChange - 20) / 10) * 25);
}

/**
 * 根據分數取得疲勞狀態
 */
export function getFatigueStatus(score: number): FatigueStatus {
  if (score <= THRESHOLDS.healthy) return 'healthy';
  if (score <= THRESHOLDS.warning) return 'warning';
  return 'fatigued';
}

/**
 * 計算素材疲勞度
 *
 * 根據四個因子計算加權平均疲勞分數
 *
 * @param input 疲勞計算輸入參數
 * @returns 疲勞計算結果，包含分數、狀態和明細
 *
 * @example
 * ```ts
 * const result = calculateFatigueScore({
 *   ctrChange: -15,      // CTR 下降 15%
 *   frequency: 3.2,      // 平均曝光 3.2 次/人
 *   daysActive: 21,      // 投放 21 天
 *   conversionRateChange: -5, // 轉換率下降 5%
 * });
 *
 * console.log(result.score);  // 56 (warning)
 * console.log(result.status); // 'warning'
 * ```
 */
export function calculateFatigueScore(input: FatigueInput): FatigueResult {
  const ctrScore = calculateCtrScore(input.ctrChange);
  const frequencyScore = calculateFrequencyScore(input.frequency);
  const daysScore = calculateDaysScore(input.daysActive);
  const conversionScore = calculateConversionScore(input.conversionRateChange);

  const score = Math.round(
    ctrScore * WEIGHTS.ctr +
    frequencyScore * WEIGHTS.frequency +
    daysScore * WEIGHTS.days +
    conversionScore * WEIGHTS.conversion
  );

  return {
    score,
    status: getFatigueStatus(score),
    breakdown: {
      ctrScore,
      frequencyScore,
      daysScore,
      conversionScore,
    },
  };
}

/**
 * 匯出門檻常數供 UI 使用
 */
export const FATIGUE_THRESHOLDS = THRESHOLDS;
export const FATIGUE_WEIGHTS = WEIGHTS;
