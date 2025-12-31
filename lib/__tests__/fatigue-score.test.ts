/**
 * 疲勞度計算單元測試
 *
 * 遵循 TDD 原則，測試 specs/requirements.md 中定義的疲勞度公式
 */

import { describe, it, expect } from 'vitest';
import {
  calculateFatigueScore,
  calculateCtrScore,
  calculateFrequencyScore,
  calculateDaysScore,
  calculateConversionScore,
  getFatigueStatus,
  FATIGUE_THRESHOLDS,
} from '../utils/fatigue-score';

describe('Fatigue Score Calculation', () => {
  describe('calculateCtrScore', () => {
    it('should return 0 when CTR is improving (positive change)', () => {
      expect(calculateCtrScore(5)).toBe(0);
      expect(calculateCtrScore(0.1)).toBe(0);
    });

    it('should return 25-50 when CTR drops 0-10%', () => {
      expect(calculateCtrScore(0)).toBe(25);
      expect(calculateCtrScore(-5)).toBe(37.5);
      expect(calculateCtrScore(-10)).toBe(50);
    });

    it('should return 50-75 when CTR drops 10-20%', () => {
      expect(calculateCtrScore(-15)).toBe(62.5);
      expect(calculateCtrScore(-20)).toBe(75);
    });

    it('should return 75-100 when CTR drops > 20%', () => {
      expect(calculateCtrScore(-25)).toBe(87.5);
      expect(calculateCtrScore(-30)).toBe(100);
      expect(calculateCtrScore(-50)).toBe(100); // capped at 100
    });
  });

  describe('calculateFrequencyScore', () => {
    it('should return 0-25 when frequency < 2', () => {
      expect(calculateFrequencyScore(0)).toBe(0);
      expect(calculateFrequencyScore(1)).toBe(12.5);
      expect(calculateFrequencyScore(2)).toBe(25);
    });

    it('should return 25-50 when frequency is 2-3', () => {
      expect(calculateFrequencyScore(2.5)).toBe(37.5);
      expect(calculateFrequencyScore(3)).toBe(50);
    });

    it('should return 50-75 when frequency is 3-4', () => {
      expect(calculateFrequencyScore(3.5)).toBe(62.5);
      expect(calculateFrequencyScore(4)).toBe(75);
    });

    it('should return 75-100 when frequency > 4', () => {
      expect(calculateFrequencyScore(5)).toBe(87.5);
      expect(calculateFrequencyScore(6)).toBe(100);
      expect(calculateFrequencyScore(10)).toBe(100); // capped at 100
    });
  });

  describe('calculateDaysScore', () => {
    it('should return 0-25 when days < 7', () => {
      expect(calculateDaysScore(0)).toBe(0);
      expect(calculateDaysScore(3.5)).toBeCloseTo(12.5, 1);
      expect(calculateDaysScore(7)).toBe(25);
    });

    it('should return 25-50 when days is 7-14', () => {
      expect(calculateDaysScore(10.5)).toBe(37.5);
      expect(calculateDaysScore(14)).toBe(50);
    });

    it('should return 50-75 when days is 14-30', () => {
      expect(calculateDaysScore(22)).toBeCloseTo(62.5, 1);
      expect(calculateDaysScore(30)).toBe(75);
    });

    it('should return 75-100 when days > 30', () => {
      expect(calculateDaysScore(45)).toBe(87.5);
      expect(calculateDaysScore(60)).toBe(100);
      expect(calculateDaysScore(120)).toBe(100); // capped at 100
    });
  });

  describe('calculateConversionScore', () => {
    it('should return 0 when conversion rate is improving', () => {
      expect(calculateConversionScore(5)).toBe(0);
      expect(calculateConversionScore(0.1)).toBe(0);
    });

    it('should return 25-50 when conversion drops 0-10%', () => {
      expect(calculateConversionScore(0)).toBe(25);
      expect(calculateConversionScore(-5)).toBe(37.5);
      expect(calculateConversionScore(-10)).toBe(50);
    });

    it('should return 50-75 when conversion drops 10-20%', () => {
      expect(calculateConversionScore(-15)).toBe(62.5);
      expect(calculateConversionScore(-20)).toBe(75);
    });

    it('should return 75-100 when conversion drops > 20%', () => {
      expect(calculateConversionScore(-25)).toBe(87.5);
      expect(calculateConversionScore(-30)).toBe(100);
    });
  });

  describe('getFatigueStatus', () => {
    it('should return "healthy" for scores 0-40', () => {
      expect(getFatigueStatus(0)).toBe('healthy');
      expect(getFatigueStatus(20)).toBe('healthy');
      expect(getFatigueStatus(40)).toBe('healthy');
    });

    it('should return "warning" for scores 41-70', () => {
      expect(getFatigueStatus(41)).toBe('warning');
      expect(getFatigueStatus(55)).toBe('warning');
      expect(getFatigueStatus(70)).toBe('warning');
    });

    it('should return "fatigued" for scores 71-100', () => {
      expect(getFatigueStatus(71)).toBe('fatigued');
      expect(getFatigueStatus(85)).toBe('fatigued');
      expect(getFatigueStatus(100)).toBe('fatigued');
    });
  });

  describe('calculateFatigueScore', () => {
    it('should return healthy score for new, well-performing creative', () => {
      const result = calculateFatigueScore({
        ctrChange: 5,           // CTR 提升
        frequency: 1.5,         // 低頻率
        daysActive: 5,          // 新素材
        conversionRateChange: 2, // 轉換率提升
      });

      expect(result.score).toBeLessThanOrEqual(FATIGUE_THRESHOLDS.healthy);
      expect(result.status).toBe('healthy');
    });

    it('should return warning score for aging creative with declining metrics', () => {
      const result = calculateFatigueScore({
        ctrChange: -15,         // CTR 下降 15%
        frequency: 3.2,         // 中等頻率
        daysActive: 21,         // 3 週
        conversionRateChange: -5, // 轉換率下降 5%
      });

      expect(result.score).toBeGreaterThan(FATIGUE_THRESHOLDS.healthy);
      expect(result.score).toBeLessThanOrEqual(FATIGUE_THRESHOLDS.warning);
      expect(result.status).toBe('warning');
    });

    it('should return fatigued score for old creative with poor metrics', () => {
      const result = calculateFatigueScore({
        ctrChange: -25,         // CTR 大幅下降
        frequency: 5,           // 高頻率
        daysActive: 45,         // 6 週以上
        conversionRateChange: -20, // 轉換率大幅下降
      });

      expect(result.score).toBeGreaterThan(FATIGUE_THRESHOLDS.warning);
      expect(result.status).toBe('fatigued');
    });

    it('should include breakdown of individual factor scores', () => {
      const result = calculateFatigueScore({
        ctrChange: -10,
        frequency: 3,
        daysActive: 14,
        conversionRateChange: -10,
      });

      expect(result.breakdown).toHaveProperty('ctrScore');
      expect(result.breakdown).toHaveProperty('frequencyScore');
      expect(result.breakdown).toHaveProperty('daysScore');
      expect(result.breakdown).toHaveProperty('conversionScore');

      // 驗證各因子分數在預期範圍內
      expect(result.breakdown.ctrScore).toBe(50);
      expect(result.breakdown.frequencyScore).toBe(50);
      expect(result.breakdown.daysScore).toBe(50);
      expect(result.breakdown.conversionScore).toBe(50);
    });

    it('should correctly apply weights to final score', () => {
      // 所有因子都是 50 分，加權平均應該也是 50
      const result = calculateFatigueScore({
        ctrChange: -10,         // 50 分 * 40%
        frequency: 3,           // 50 分 * 30%
        daysActive: 14,         // 50 分 * 20%
        conversionRateChange: -10, // 50 分 * 10%
      });

      expect(result.score).toBe(50);
    });

    it('should handle edge case with zero values', () => {
      const result = calculateFatigueScore({
        ctrChange: 0,
        frequency: 0,
        daysActive: 0,
        conversionRateChange: 0,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.status).toBeDefined();
    });
  });
});
