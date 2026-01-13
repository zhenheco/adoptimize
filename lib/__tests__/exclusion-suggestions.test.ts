/**
 * 受眾排除建議工具函數測試
 *
 * A-005: Exclusion Suggestions
 * - 根據重疊分析建議排除
 * - 顯示預估影響
 * - 一鍵執行排除
 *
 * TDD 🔴 Red Phase: 先寫測試
 */

import { describe, it, expect } from 'vitest';
import type { AudienceOverlapPair } from '../utils/audience-overlap';

// 這些函數尚未實作，測試應該失敗
import {
  type ExclusionSuggestion,
  type ExclusionDirection,
  type EstimatedImpact,
  generateExclusionSuggestion,
  calculateEstimatedImpact,
  determineExclusionDirection,
  formatImpactSummary,
  getExclusionPriority,
  type ExclusionPriority,
} from '../utils/exclusion-suggestions';

describe('exclusion-suggestions', () => {
  // 測試用的重疊配對資料
  const mockOverlapPair: AudienceOverlapPair = {
    audience1: { id: 'aud-1', name: '高價值購買者', size: 50000 },
    audience2: { id: 'aud-2', name: '網站訪客', size: 30000 },
    overlapCount: 12000,
    overlapPercentage: 40, // 40% overlap (high)
    status: 'high',
  };

  const mockOverlapPairLow: AudienceOverlapPair = {
    audience1: { id: 'aud-3', name: '新用戶', size: 80000 },
    audience2: { id: 'aud-4', name: '購物車放棄者', size: 20000 },
    overlapCount: 2000,
    overlapPercentage: 10, // 10% overlap (low)
    status: 'low',
  };

  const mockOverlapPairVeryHigh: AudienceOverlapPair = {
    audience1: { id: 'aud-5', name: '忠實客戶', size: 25000 },
    audience2: { id: 'aud-6', name: 'VIP會員', size: 20000 },
    overlapCount: 16000,
    overlapPercentage: 80, // 80% overlap (very high)
    status: 'high',
  };

  describe('determineExclusionDirection', () => {
    it('should recommend excluding smaller audience from larger one', () => {
      const direction = determineExclusionDirection(mockOverlapPair);
      expect(direction.sourceAudience).toEqual(mockOverlapPair.audience1); // 較大
      expect(direction.excludeAudience).toEqual(mockOverlapPair.audience2); // 較小被排除
      expect(direction.reason).toContain('較小受眾');
    });

    it('should handle equal-sized audiences', () => {
      const equalPair: AudienceOverlapPair = {
        audience1: { id: 'a', name: 'Audience A', size: 10000 },
        audience2: { id: 'b', name: 'Audience B', size: 10000 },
        overlapCount: 4000,
        overlapPercentage: 40,
        status: 'high',
      };
      const direction = determineExclusionDirection(equalPair);
      // 相同大小時，應該選擇其中一個（可能基於效能或字母順序）
      expect(direction.sourceAudience).toBeDefined();
      expect(direction.excludeAudience).toBeDefined();
      expect(direction.sourceAudience).not.toEqual(direction.excludeAudience);
    });

    it('should provide reason in Traditional Chinese', () => {
      const direction = determineExclusionDirection(mockOverlapPair);
      // 理由應該是繁體中文
      expect(direction.reason).toMatch(/[\u4e00-\u9fff]/);
    });
  });

  describe('calculateEstimatedImpact', () => {
    it('should calculate overlap spend reduction', () => {
      const impact = calculateEstimatedImpact(mockOverlapPair, {
        audience1Spend: 5000, // NT$5000/week
        audience2Spend: 3000, // NT$3000/week
      });

      // 預估節省 = 重疊比例 * 較小受眾花費
      expect(impact.estimatedSavings).toBeGreaterThan(0);
      expect(impact.estimatedSavings).toBeLessThanOrEqual(3000 * 0.4); // 最多40%
    });

    it('should calculate CPA improvement estimate', () => {
      const impact = calculateEstimatedImpact(mockOverlapPair, {
        audience1Spend: 5000,
        audience2Spend: 3000,
        audience1CPA: 150,
        audience2CPA: 180,
      });

      // 排除後 CPA 應該改善（因為減少了自我競爭）
      expect(impact.estimatedCPAImprovement).toBeGreaterThan(0);
    });

    it('should handle missing spend data gracefully', () => {
      const impact = calculateEstimatedImpact(mockOverlapPair, {});

      // 沒有花費資料時，應該返回 0 或預估值
      expect(impact.estimatedSavings).toBe(0);
      expect(impact.dataAvailable).toBe(false);
    });

    it('should cap savings at reasonable maximum', () => {
      const extremePair: AudienceOverlapPair = {
        ...mockOverlapPairVeryHigh,
        overlapPercentage: 95,
      };

      const impact = calculateEstimatedImpact(extremePair, {
        audience1Spend: 100000,
        audience2Spend: 80000,
      });

      // 即使 95% 重疊，節省估計也不應超過較小受眾的全部花費
      expect(impact.estimatedSavings).toBeLessThanOrEqual(80000);
    });
  });

  describe('generateExclusionSuggestion', () => {
    it('should generate actionable suggestion for high overlap', () => {
      const suggestion = generateExclusionSuggestion(mockOverlapPair, {
        audience1Spend: 5000,
        audience2Spend: 3000,
      });

      expect(suggestion.shouldExclude).toBe(true);
      expect(suggestion.priority).toBe('high');
      expect(suggestion.direction).toBeDefined();
      expect(suggestion.impact).toBeDefined();
    });

    it('should not suggest exclusion for low overlap', () => {
      const suggestion = generateExclusionSuggestion(mockOverlapPairLow, {
        audience1Spend: 5000,
        audience2Spend: 3000,
      });

      expect(suggestion.shouldExclude).toBe(false);
      expect(suggestion.reason).toContain('重疊率低');
    });

    it('should suggest merge for very high overlap (>70%)', () => {
      const suggestion = generateExclusionSuggestion(mockOverlapPairVeryHigh, {
        audience1Spend: 5000,
        audience2Spend: 3000,
      });

      expect(suggestion.alternativeAction).toBe('merge');
      expect(suggestion.alternativeReason).toContain('合併');
    });

    it('should include action steps in suggestion', () => {
      const suggestion = generateExclusionSuggestion(mockOverlapPair, {
        audience1Spend: 5000,
        audience2Spend: 3000,
      });

      expect(suggestion.actionSteps).toBeInstanceOf(Array);
      expect(suggestion.actionSteps.length).toBeGreaterThan(0);
      // 第一步應該描述在哪裡操作
      expect(suggestion.actionSteps[0]).toContain('編輯');
    });
  });

  describe('formatImpactSummary', () => {
    it('should format savings in NT$ currency', () => {
      const impact: EstimatedImpact = {
        estimatedSavings: 1200,
        estimatedCPAImprovement: 5.2,
        overlapReduction: 40,
        dataAvailable: true,
      };

      const summary = formatImpactSummary(impact);
      expect(summary.savings).toBe('NT$1,200');
    });

    it('should format CPA improvement as percentage', () => {
      const impact: EstimatedImpact = {
        estimatedSavings: 1200,
        estimatedCPAImprovement: 5.2,
        overlapReduction: 40,
        dataAvailable: true,
      };

      const summary = formatImpactSummary(impact);
      expect(summary.cpaImprovement).toBe('-5.2%');
    });

    it('should show "N/A" when data unavailable', () => {
      const impact: EstimatedImpact = {
        estimatedSavings: 0,
        estimatedCPAImprovement: 0,
        overlapReduction: 40,
        dataAvailable: false,
      };

      const summary = formatImpactSummary(impact);
      expect(summary.savings).toBe('N/A');
    });

    it('should include overlap reduction percentage', () => {
      const impact: EstimatedImpact = {
        estimatedSavings: 1200,
        estimatedCPAImprovement: 5.2,
        overlapReduction: 40,
        dataAvailable: true,
      };

      const summary = formatImpactSummary(impact);
      expect(summary.overlapReduction).toBe('40%');
    });
  });

  describe('getExclusionPriority', () => {
    it('should return "critical" for overlap > 60%', () => {
      const priority = getExclusionPriority(65);
      expect(priority).toBe('critical');
    });

    it('should return "high" for overlap 40-60%', () => {
      const priority = getExclusionPriority(45);
      expect(priority).toBe('high');
    });

    it('should return "medium" for overlap 30-40%', () => {
      const priority = getExclusionPriority(35);
      expect(priority).toBe('medium');
    });

    it('should return "low" for overlap 20-30%', () => {
      const priority = getExclusionPriority(25);
      expect(priority).toBe('low');
    });

    it('should return "none" for overlap < 20%', () => {
      const priority = getExclusionPriority(15);
      expect(priority).toBe('none');
    });

    it('should handle boundary values correctly', () => {
      expect(getExclusionPriority(20)).toBe('low');
      expect(getExclusionPriority(30)).toBe('medium');
      expect(getExclusionPriority(40)).toBe('high');
      expect(getExclusionPriority(60)).toBe('critical');
    });
  });

  describe('ExclusionSuggestion type properties', () => {
    it('should have all required properties when exclusion is suggested', () => {
      const suggestion = generateExclusionSuggestion(mockOverlapPair, {
        audience1Spend: 5000,
        audience2Spend: 3000,
      });

      // Type checking via assertion
      expect(suggestion).toHaveProperty('shouldExclude');
      expect(suggestion).toHaveProperty('priority');
      expect(suggestion).toHaveProperty('direction');
      expect(suggestion).toHaveProperty('impact');
      expect(suggestion).toHaveProperty('actionSteps');
      expect(suggestion).toHaveProperty('reason');
    });

    it('should have direction with source and exclude audiences', () => {
      const suggestion = generateExclusionSuggestion(mockOverlapPair, {
        audience1Spend: 5000,
        audience2Spend: 3000,
      });

      expect(suggestion.direction).toHaveProperty('sourceAudience');
      expect(suggestion.direction).toHaveProperty('excludeAudience');
      expect(suggestion.direction).toHaveProperty('reason');
    });

    it('should have impact with estimated values', () => {
      const suggestion = generateExclusionSuggestion(mockOverlapPair, {
        audience1Spend: 5000,
        audience2Spend: 3000,
      });

      expect(suggestion.impact).toHaveProperty('estimatedSavings');
      expect(suggestion.impact).toHaveProperty('estimatedCPAImprovement');
      expect(suggestion.impact).toHaveProperty('overlapReduction');
      expect(suggestion.impact).toHaveProperty('dataAvailable');
    });
  });
});
