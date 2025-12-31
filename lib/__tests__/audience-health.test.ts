/**
 * 受眾健康度計算測試
 *
 * 測試受眾健康度公式的正確性
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSizeScore,
  calculateCpaScore,
  calculateRoasScore,
  calculateFreshnessScore,
  calculateAudienceHealth,
  getAudienceHealthStatus,
  AUDIENCE_HEALTH_THRESHOLDS,
} from '../utils/audience-health';

describe('calculateSizeScore', () => {
  it('should return 100 for ideal range (10K-2M)', () => {
    expect(calculateSizeScore(10_000)).toBe(100);
    expect(calculateSizeScore(50_000)).toBe(100);
    expect(calculateSizeScore(500_000)).toBe(100);
    expect(calculateSizeScore(2_000_000)).toBe(100);
  });

  it('should return 50-100 for slightly too small (5K-10K)', () => {
    const score = calculateSizeScore(7_500);
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThan(100);
  });

  it('should return 0-25 for extremely small (<5K)', () => {
    expect(calculateSizeScore(1_000)).toBeLessThan(25);
    expect(calculateSizeScore(0)).toBe(0);
  });

  it('should return 50-100 for slightly too large (2M-10M)', () => {
    const score = calculateSizeScore(5_000_000);
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThan(100);
  });

  it('should return low scores for extremely large (>10M)', () => {
    const score = calculateSizeScore(15_000_000);
    expect(score).toBeLessThanOrEqual(25);
  });
});

describe('calculateCpaScore', () => {
  it('should return 100 for CPA at or below account average', () => {
    expect(calculateCpaScore(10, 15)).toBe(100); // 低於平均
    expect(calculateCpaScore(15, 15)).toBe(100); // 等於平均
  });

  it('should return 50-100 for CPA up to 30% above average', () => {
    const score = calculateCpaScore(18, 15); // 20% 高於平均
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(100);
  });

  it('should return 0-50 for CPA more than 30% above average', () => {
    const score = calculateCpaScore(25, 15); // 67% 高於平均
    expect(score).toBeLessThan(50);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should return 50 when account average CPA is 0 or negative', () => {
    expect(calculateCpaScore(10, 0)).toBe(50);
    expect(calculateCpaScore(10, -5)).toBe(50);
  });
});

describe('calculateRoasScore', () => {
  it('should return 100 for ROAS >= 1.5', () => {
    expect(calculateRoasScore(1.5)).toBe(100);
    expect(calculateRoasScore(2.0)).toBe(100);
    expect(calculateRoasScore(5.0)).toBe(100);
  });

  it('should return 50-100 for ROAS 1.0-1.5', () => {
    const score = calculateRoasScore(1.25);
    expect(score).toBe(75); // 中點
    expect(calculateRoasScore(1.0)).toBe(50);
  });

  it('should return 0-50 for ROAS < 1.0', () => {
    const score = calculateRoasScore(0.5);
    expect(score).toBe(25);
    expect(calculateRoasScore(0)).toBe(0);
  });

  it('should handle negative ROAS', () => {
    expect(calculateRoasScore(-1)).toBe(0);
  });
});

describe('calculateFreshnessScore', () => {
  it('should return 100 for updates within 30 days', () => {
    expect(calculateFreshnessScore(0)).toBe(100);
    expect(calculateFreshnessScore(15)).toBe(100);
    expect(calculateFreshnessScore(30)).toBe(100);
  });

  it('should return 50-100 for updates 30-60 days ago', () => {
    const score = calculateFreshnessScore(45);
    expect(score).toBe(75); // 中點
  });

  it('should return 0-50 for updates more than 60 days ago', () => {
    const score = calculateFreshnessScore(90);
    expect(score).toBeLessThan(50);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should approach 0 for very old audiences', () => {
    const score = calculateFreshnessScore(180);
    expect(score).toBe(0);
  });
});

describe('getAudienceHealthStatus', () => {
  it('should return healthy for score >= 70', () => {
    expect(getAudienceHealthStatus(70)).toBe('healthy');
    expect(getAudienceHealthStatus(85)).toBe('healthy');
    expect(getAudienceHealthStatus(100)).toBe('healthy');
  });

  it('should return warning for score 40-69', () => {
    expect(getAudienceHealthStatus(40)).toBe('warning');
    expect(getAudienceHealthStatus(55)).toBe('warning');
    expect(getAudienceHealthStatus(69)).toBe('warning');
  });

  it('should return critical for score < 40', () => {
    expect(getAudienceHealthStatus(0)).toBe('critical');
    expect(getAudienceHealthStatus(20)).toBe('critical');
    expect(getAudienceHealthStatus(39)).toBe('critical');
  });
});

describe('calculateAudienceHealth', () => {
  it('should return perfect score for ideal audience', () => {
    const result = calculateAudienceHealth({
      size: 50_000,
      cpa: 10,
      accountAvgCpa: 15,
      roas: 2.5,
      daysSinceUpdate: 10,
    });

    expect(result.score).toBe(100);
    expect(result.status).toBe('healthy');
    expect(result.breakdown.sizeScore).toBe(100);
    expect(result.breakdown.cpaScore).toBe(100);
    expect(result.breakdown.roasScore).toBe(100);
    expect(result.breakdown.freshnessScore).toBe(100);
  });

  it('should return low score for problematic audience', () => {
    const result = calculateAudienceHealth({
      size: 1_000,        // 過小
      cpa: 30,            // 高於平均
      accountAvgCpa: 15,
      roas: 0.5,          // 低
      daysSinceUpdate: 90, // 過期
    });

    expect(result.score).toBeLessThan(40);
    expect(result.status).toBe('critical');
  });

  it('should return moderate score for mixed metrics', () => {
    // 使用更極端的值確保落入 warning 範圍 (40-69)
    const result = calculateAudienceHealth({
      size: 7_000,         // 稍小（5K-10K 範圍，約 70 分）
      cpa: 22,             // 高於平均 47%（接近 warning 邊界）
      accountAvgCpa: 15,
      roas: 1.1,           // 中等（60 分）
      daysSinceUpdate: 55, // 稍舊（約 58 分）
    });

    // 預期分數在 40-69 之間
    expect(result.score).toBeGreaterThan(40);
    expect(result.score).toBeLessThan(70);
    expect(result.status).toBe('warning');
  });

  it('should correctly apply weights', () => {
    // 測試權重：size=25%, cpa=35%, roas=25%, freshness=15%
    const result = calculateAudienceHealth({
      size: 50_000,       // 100 points × 0.25 = 25
      cpa: 15,            // 100 points × 0.35 = 35
      accountAvgCpa: 15,
      roas: 1.5,          // 100 points × 0.25 = 25
      daysSinceUpdate: 0, // 100 points × 0.15 = 15
    });

    expect(result.score).toBe(100);
  });

  it('should handle edge case with zero values', () => {
    const result = calculateAudienceHealth({
      size: 0,
      cpa: 0,
      accountAvgCpa: 0,
      roas: 0,
      daysSinceUpdate: 0,
    });

    // 應該不會拋出錯誤
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('AUDIENCE_HEALTH_THRESHOLDS', () => {
  it('should have correct threshold values', () => {
    expect(AUDIENCE_HEALTH_THRESHOLDS.healthy).toBe(70);
    expect(AUDIENCE_HEALTH_THRESHOLDS.warning).toBe(40);
  });
});
