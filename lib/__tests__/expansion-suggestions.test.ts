/**
 * 受眾擴展建議工具函數測試
 *
 * A-006: Expansion Suggestions
 * - AC1: 小受眾建議 Lookalike 擴展
 * - AC2: 顯示建議的相似度百分比
 * - AC3: 預估新增觸及數
 *
 * TDD 🔴 Red Phase: 先寫測試
 */

import { describe, it, expect } from 'vitest';
import type { Audience } from '../api/types';

// 匯入待實作的函數
import {
  type ExpansionPriority,
  type ExpansionSuggestion,
  type LookalikeConfig,
  type EstimatedReach,
  isSmallAudience,
  getExpansionPriority,
  calculateEstimatedReach,
  generateExpansionSuggestion,
  generateLookalikeConfig,
  getSuggestedSimilarityPercentages,
  formatEstimatedReach,
} from '../utils/expansion-suggestions';

describe('expansion-suggestions', () => {
  // 測試用的小受眾資料（< 10,000 人）
  const mockSmallAudience: Audience = {
    id: 'aud-small-1',
    name: '高價值 VIP 客戶',
    type: 'CUSTOM',
    size: 5000,
    source: 'CUSTOMER_LIST',
    metrics: {
      reach: 4500,
      impressions: 50000,
      conversions: 150,
      spend: 3000,
      cpa: 20,
      roas: 4.5,
    },
    health_score: 85,
  };

  // 測試用的極小受眾（< 1,000 人）
  const mockVerySmallAudience: Audience = {
    id: 'aud-very-small-1',
    name: '頂級客戶',
    type: 'CUSTOM',
    size: 500,
    source: 'CUSTOMER_LIST',
    metrics: {
      reach: 450,
      impressions: 5000,
      conversions: 50,
      spend: 500,
      cpa: 10,
      roas: 8.0,
    },
    health_score: 90,
  };

  // 測試用的中等受眾（10,000 - 100,000）
  const mockMediumAudience: Audience = {
    id: 'aud-medium-1',
    name: '網站訪客',
    type: 'CUSTOM',
    size: 50000,
    source: 'WEBSITE',
    metrics: {
      reach: 45000,
      impressions: 500000,
      conversions: 500,
      spend: 10000,
      cpa: 20,
      roas: 3.0,
    },
    health_score: 75,
  };

  // 測試用的大受眾（> 100,000）
  const mockLargeAudience: Audience = {
    id: 'aud-large-1',
    name: '興趣受眾',
    type: 'SAVED',
    size: 500000,
    source: 'INTEREST',
    metrics: {
      reach: 400000,
      impressions: 2000000,
      conversions: 800,
      spend: 20000,
      cpa: 25,
      roas: 2.5,
    },
    health_score: 65,
  };

  // 測試用的 Lookalike 受眾
  const mockLookalikeAudience: Audience = {
    id: 'aud-lookalike-1',
    name: 'Lookalike 1% - VIP客戶',
    type: 'LOOKALIKE',
    size: 200000,
    source: 'LOOKALIKE',
    metrics: {
      reach: 180000,
      impressions: 1000000,
      conversions: 300,
      spend: 8000,
      cpa: 26.67,
      roas: 2.8,
    },
    health_score: 70,
  };

  // 測試用的高效能小受眾
  const mockHighPerformingSmall: Audience = {
    id: 'aud-hp-small-1',
    name: '超級購買者',
    type: 'CUSTOM',
    size: 2000,
    source: 'CUSTOMER_LIST',
    metrics: {
      reach: 1800,
      impressions: 20000,
      conversions: 100,
      spend: 1000,
      cpa: 10,
      roas: 10.0,
    },
    health_score: 95,
  };

  describe('isSmallAudience', () => {
    it('should return true for audience < 10,000', () => {
      expect(isSmallAudience(mockSmallAudience)).toBe(true);
    });

    it('should return true for very small audience < 1,000', () => {
      expect(isSmallAudience(mockVerySmallAudience)).toBe(true);
    });

    it('should return false for medium audience >= 10,000', () => {
      expect(isSmallAudience(mockMediumAudience)).toBe(false);
    });

    it('should return false for large audience', () => {
      expect(isSmallAudience(mockLargeAudience)).toBe(false);
    });

    it('should handle boundary value of 10,000', () => {
      const boundaryAudience = { ...mockSmallAudience, size: 10000 };
      expect(isSmallAudience(boundaryAudience)).toBe(false);
    });

    it('should handle size of 0', () => {
      const zeroAudience = { ...mockSmallAudience, size: 0 };
      expect(isSmallAudience(zeroAudience)).toBe(true);
    });
  });

  describe('getExpansionPriority', () => {
    it('should return "high" for high-performing small audience', () => {
      // 高效能 + 小規模 = 高優先擴展
      const priority = getExpansionPriority(mockHighPerformingSmall);
      expect(priority).toBe('high');
    });

    it('should return "medium" for regular small audience', () => {
      const priority = getExpansionPriority(mockSmallAudience);
      expect(priority).toBe('medium');
    });

    it('should return "low" for very small audience with moderate performance', () => {
      const moderateVerySmall = {
        ...mockVerySmallAudience,
        metrics: { ...mockVerySmallAudience.metrics, roas: 2.5, cpa: 30 },
        health_score: 70,
      };
      const priority = getExpansionPriority(moderateVerySmall);
      expect(priority).toBe('low');
    });

    it('should return "none" for medium/large audience', () => {
      const priority = getExpansionPriority(mockMediumAudience);
      expect(priority).toBe('none');
    });

    it('should return "none" for lookalike audience (already expanded)', () => {
      // Lookalike 本身已是擴展受眾，不需要再擴展
      const priority = getExpansionPriority(mockLookalikeAudience);
      expect(priority).toBe('none');
    });

    it('should consider ROAS in priority calculation', () => {
      const lowRoasAudience = {
        ...mockSmallAudience,
        metrics: { ...mockSmallAudience.metrics, roas: 1.5 },
      };
      const highRoasAudience = {
        ...mockSmallAudience,
        metrics: { ...mockSmallAudience.metrics, roas: 8.0 },
      };

      expect(getExpansionPriority(highRoasAudience)).toBe('high');
      expect(getExpansionPriority(lowRoasAudience)).not.toBe('high');
    });
  });

  describe('getSuggestedSimilarityPercentages', () => {
    it('should suggest 1% for very small high-quality audience', () => {
      const percentages = getSuggestedSimilarityPercentages(mockVerySmallAudience);
      expect(percentages).toContain(1);
      expect(percentages[0]).toBe(1); // 推薦的應該在第一個
    });

    it('should suggest 1-2% for small high-quality audience', () => {
      const percentages = getSuggestedSimilarityPercentages(mockHighPerformingSmall);
      expect(percentages).toContain(1);
      expect(percentages).toContain(2);
    });

    it('should suggest 1-3% for regular small audience', () => {
      const percentages = getSuggestedSimilarityPercentages(mockSmallAudience);
      expect(percentages.length).toBeGreaterThanOrEqual(2);
      expect(percentages.length).toBeLessThanOrEqual(4);
    });

    it('should return empty array for non-small audiences', () => {
      const percentages = getSuggestedSimilarityPercentages(mockMediumAudience);
      expect(percentages).toEqual([]);
    });

    it('should return empty array for lookalike audiences', () => {
      const percentages = getSuggestedSimilarityPercentages(mockLookalikeAudience);
      expect(percentages).toEqual([]);
    });

    it('should return percentages sorted by recommendation (best first)', () => {
      const percentages = getSuggestedSimilarityPercentages(mockSmallAudience);
      // 對於高效能受眾，較低的相似度百分比是更好的選擇（更精準）
      if (percentages.length > 1) {
        expect(percentages[0]).toBeLessThanOrEqual(percentages[percentages.length - 1]);
      }
    });
  });

  describe('calculateEstimatedReach', () => {
    // 台灣市場預估總人口約 2000 萬
    const TAIWAN_MARKET_SIZE = 20000000;

    it('should calculate estimated reach for 1% lookalike', () => {
      const reach = calculateEstimatedReach(mockSmallAudience, 1);
      // 1% 的 2000 萬 = 20 萬
      expect(reach.estimatedSize).toBeGreaterThanOrEqual(180000);
      expect(reach.estimatedSize).toBeLessThanOrEqual(220000);
    });

    it('should calculate estimated reach for 2% lookalike', () => {
      const reach = calculateEstimatedReach(mockSmallAudience, 2);
      // 2% 的 2000 萬 = 40 萬
      expect(reach.estimatedSize).toBeGreaterThanOrEqual(350000);
      expect(reach.estimatedSize).toBeLessThanOrEqual(450000);
    });

    it('should calculate additional reach (new - source)', () => {
      const reach = calculateEstimatedReach(mockSmallAudience, 1);
      // 新增觸及 = 估計規模 - 原始規模
      expect(reach.additionalReach).toBe(reach.estimatedSize - mockSmallAudience.size);
    });

    it('should calculate growth multiplier', () => {
      const reach = calculateEstimatedReach(mockSmallAudience, 1);
      // 成長倍數 = 新規模 / 原始規模
      expect(reach.growthMultiplier).toBe(reach.estimatedSize / mockSmallAudience.size);
    });

    it('should calculate estimated CPA adjustment', () => {
      const reach = calculateEstimatedReach(mockSmallAudience, 1);
      // Lookalike 通常 CPA 會略高於原始受眾
      expect(reach.estimatedCPA).toBeGreaterThan(mockSmallAudience.metrics.cpa);
    });

    it('should show higher CPA adjustment for broader lookalike', () => {
      const reach1 = calculateEstimatedReach(mockSmallAudience, 1);
      const reach3 = calculateEstimatedReach(mockSmallAudience, 3);
      // 3% lookalike 應該比 1% lookalike 有更高的 CPA
      expect(reach3.estimatedCPA).toBeGreaterThan(reach1.estimatedCPA);
    });

    it('should include market size context', () => {
      const reach = calculateEstimatedReach(mockSmallAudience, 1);
      expect(reach.marketSize).toBe(TAIWAN_MARKET_SIZE);
    });

    it('should handle edge case of 0 size audience', () => {
      const zeroAudience = { ...mockSmallAudience, size: 0 };
      const reach = calculateEstimatedReach(zeroAudience, 1);
      expect(reach.estimatedSize).toBeGreaterThan(0);
      expect(reach.growthMultiplier).toBe(Infinity);
    });
  });

  describe('generateLookalikeConfig', () => {
    it('should generate config with source audience ID', () => {
      const config = generateLookalikeConfig(mockSmallAudience, 1);
      expect(config.sourceAudienceId).toBe(mockSmallAudience.id);
    });

    it('should generate suggested name', () => {
      const config = generateLookalikeConfig(mockSmallAudience, 1);
      expect(config.suggestedName).toContain('Lookalike');
      expect(config.suggestedName).toContain('1%');
      expect(config.suggestedName).toContain(mockSmallAudience.name);
    });

    it('should include similarity percentage', () => {
      const config = generateLookalikeConfig(mockSmallAudience, 2);
      expect(config.similarityPercentage).toBe(2);
    });

    it('should suggest target country (Taiwan)', () => {
      const config = generateLookalikeConfig(mockSmallAudience, 1);
      expect(config.targetCountry).toBe('TW');
    });

    it('should include estimated size', () => {
      const config = generateLookalikeConfig(mockSmallAudience, 1);
      expect(config.estimatedSize).toBeGreaterThan(0);
    });
  });

  describe('generateExpansionSuggestion', () => {
    it('should generate suggestion for small custom audience', () => {
      const suggestion = generateExpansionSuggestion(mockSmallAudience);

      expect(suggestion.shouldExpand).toBe(true);
      expect(suggestion.priority).not.toBe('none');
      expect(suggestion.sourceAudience).toEqual(mockSmallAudience);
    });

    it('should not suggest expansion for medium audience', () => {
      const suggestion = generateExpansionSuggestion(mockMediumAudience);

      expect(suggestion.shouldExpand).toBe(false);
      expect(suggestion.priority).toBe('none');
      expect(suggestion.reason).toContain('規模');
    });

    it('should not suggest expansion for lookalike audience', () => {
      const suggestion = generateExpansionSuggestion(mockLookalikeAudience);

      expect(suggestion.shouldExpand).toBe(false);
      expect(suggestion.reason).toContain('Lookalike');
    });

    it('should include recommended percentages', () => {
      const suggestion = generateExpansionSuggestion(mockSmallAudience);

      expect(suggestion.recommendedPercentages).toBeInstanceOf(Array);
      expect(suggestion.recommendedPercentages.length).toBeGreaterThan(0);
    });

    it('should include estimated reach for each percentage', () => {
      const suggestion = generateExpansionSuggestion(mockSmallAudience);

      expect(suggestion.estimatedReachByPercentage).toBeDefined();
      suggestion.recommendedPercentages.forEach((pct) => {
        expect(suggestion.estimatedReachByPercentage[pct]).toBeDefined();
        expect(suggestion.estimatedReachByPercentage[pct].estimatedSize).toBeGreaterThan(0);
      });
    });

    it('should include action steps', () => {
      const suggestion = generateExpansionSuggestion(mockSmallAudience);

      expect(suggestion.actionSteps).toBeInstanceOf(Array);
      expect(suggestion.actionSteps.length).toBeGreaterThan(0);
      expect(suggestion.actionSteps[0]).toContain('建立');
    });

    it('should provide reason in Traditional Chinese', () => {
      const suggestion = generateExpansionSuggestion(mockSmallAudience);

      // 理由應該是繁體中文
      expect(suggestion.reason).toMatch(/[\u4e00-\u9fff]/);
    });

    it('should include ROI analysis', () => {
      const suggestion = generateExpansionSuggestion(mockHighPerformingSmall);

      // 高效能受眾應該有 ROI 分析
      expect(suggestion.roiAnalysis).toBeDefined();
      expect(suggestion.roiAnalysis!.potentialConversions).toBeGreaterThan(0);
    });
  });

  describe('formatEstimatedReach', () => {
    it('should format large numbers with comma separators', () => {
      const reach: EstimatedReach = {
        estimatedSize: 200000,
        additionalReach: 195000,
        growthMultiplier: 40,
        estimatedCPA: 25,
        marketSize: 20000000,
      };

      const formatted = formatEstimatedReach(reach);
      expect(formatted.size).toBe('200,000');
      expect(formatted.additional).toBe('195,000');
    });

    it('should format multiplier with "x" suffix', () => {
      const reach: EstimatedReach = {
        estimatedSize: 200000,
        additionalReach: 195000,
        growthMultiplier: 40,
        estimatedCPA: 25,
        marketSize: 20000000,
      };

      const formatted = formatEstimatedReach(reach);
      expect(formatted.multiplier).toBe('40x');
    });

    it('should format CPA in NT$ currency', () => {
      const reach: EstimatedReach = {
        estimatedSize: 200000,
        additionalReach: 195000,
        growthMultiplier: 40,
        estimatedCPA: 25,
        marketSize: 20000000,
      };

      const formatted = formatEstimatedReach(reach);
      expect(formatted.cpa).toBe('NT$25');
    });

    it('should handle decimal multiplier', () => {
      const reach: EstimatedReach = {
        estimatedSize: 8000,
        additionalReach: 3000,
        growthMultiplier: 1.6,
        estimatedCPA: 22,
        marketSize: 20000000,
      };

      const formatted = formatEstimatedReach(reach);
      expect(formatted.multiplier).toBe('1.6x');
    });

    it('should handle infinity multiplier gracefully', () => {
      const reach: EstimatedReach = {
        estimatedSize: 200000,
        additionalReach: 200000,
        growthMultiplier: Infinity,
        estimatedCPA: 25,
        marketSize: 20000000,
      };

      const formatted = formatEstimatedReach(reach);
      expect(formatted.multiplier).toBe('∞');
    });
  });

  describe('ExpansionSuggestion type properties', () => {
    it('should have all required properties', () => {
      const suggestion = generateExpansionSuggestion(mockSmallAudience);

      expect(suggestion).toHaveProperty('shouldExpand');
      expect(suggestion).toHaveProperty('priority');
      expect(suggestion).toHaveProperty('sourceAudience');
      expect(suggestion).toHaveProperty('recommendedPercentages');
      expect(suggestion).toHaveProperty('estimatedReachByPercentage');
      expect(suggestion).toHaveProperty('actionSteps');
      expect(suggestion).toHaveProperty('reason');
    });

    it('should have ROI analysis for high-priority suggestions', () => {
      const suggestion = generateExpansionSuggestion(mockHighPerformingSmall);

      if (suggestion.priority === 'high') {
        expect(suggestion.roiAnalysis).toBeDefined();
        expect(suggestion.roiAnalysis).toHaveProperty('potentialConversions');
        expect(suggestion.roiAnalysis).toHaveProperty('potentialRevenue');
        expect(suggestion.roiAnalysis).toHaveProperty('breakEvenDays');
      }
    });
  });
});
