import { describe, it, expect } from 'vitest';
import {
  getOptimizationSuggestions,
  type OptimizationSuggestion,
} from '../utils/optimization-suggestions';
import type { CreativeFatigue } from '@/lib/api/types';

// 建立測試資料工廠
function createFatigue(overrides: Partial<CreativeFatigue> = {}): CreativeFatigue {
  return {
    score: 50,
    status: 'warning',
    ctr_change: -5,
    frequency: 2,
    days_active: 10,
    ...overrides,
  };
}

describe('getOptimizationSuggestions', () => {
  describe('CTR 下降相關建議', () => {
    it('should suggest visual update when CTR drops significantly (< -15%)', () => {
      const fatigue = createFatigue({ ctr_change: -20 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const ctrSuggestion = suggestions.find((s) =>
        s.title.includes('更新視覺')
      );
      expect(ctrSuggestion).toBeDefined();
    });

    it('should not suggest visual update when CTR drop is minor (> -15%)', () => {
      const fatigue = createFatigue({ ctr_change: -5 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const ctrSuggestion = suggestions.find((s) =>
        s.title.includes('更新視覺')
      );
      expect(ctrSuggestion).toBeUndefined();
    });

    it('should include CTR change in suggestion description', () => {
      const fatigue = createFatigue({ ctr_change: -25 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const ctrSuggestion = suggestions.find((s) =>
        s.title.includes('更新視覺')
      );
      expect(ctrSuggestion?.description).toContain('-25%');
    });
  });

  describe('頻率過高相關建議', () => {
    it('should suggest expanding audience when frequency is high (> 4)', () => {
      const fatigue = createFatigue({ frequency: 4.5 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const freqSuggestion = suggestions.find((s) =>
        s.title.includes('擴大受眾')
      );
      expect(freqSuggestion).toBeDefined();
    });

    it('should not suggest expanding audience when frequency is normal (< 4)', () => {
      const fatigue = createFatigue({ frequency: 2.5 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const freqSuggestion = suggestions.find((s) =>
        s.title.includes('擴大受眾')
      );
      expect(freqSuggestion).toBeUndefined();
    });

    it('should include frequency value in suggestion description', () => {
      const fatigue = createFatigue({ frequency: 5.2 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const freqSuggestion = suggestions.find((s) =>
        s.title.includes('擴大受眾')
      );
      expect(freqSuggestion?.description).toContain('5.2');
    });
  });

  describe('投放天數過長相關建議', () => {
    it('should suggest creative rotation when days active is too long (> 30)', () => {
      const fatigue = createFatigue({ days_active: 35 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const daysSuggestion = suggestions.find((s) =>
        s.title.includes('輪換素材')
      );
      expect(daysSuggestion).toBeDefined();
    });

    it('should not suggest rotation when days active is normal (< 30)', () => {
      const fatigue = createFatigue({ days_active: 14 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const daysSuggestion = suggestions.find((s) =>
        s.title.includes('輪換素材')
      );
      expect(daysSuggestion).toBeUndefined();
    });

    it('should include days active in suggestion description', () => {
      const fatigue = createFatigue({ days_active: 45 });
      const suggestions = getOptimizationSuggestions(fatigue);

      const daysSuggestion = suggestions.find((s) =>
        s.title.includes('輪換素材')
      );
      expect(daysSuggestion?.description).toContain('45');
    });
  });

  describe('多因子情況', () => {
    it('should return multiple suggestions when multiple factors are problematic', () => {
      const fatigue = createFatigue({
        ctr_change: -25,
        frequency: 5,
        days_active: 40,
      });
      const suggestions = getOptimizationSuggestions(fatigue);

      expect(suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it('should return at least one suggestion for warning status', () => {
      const fatigue = createFatigue({
        score: 50,
        status: 'warning',
        ctr_change: -10,
        frequency: 3,
        days_active: 20,
      });
      const suggestions = getOptimizationSuggestions(fatigue);

      // 即使單一因子未達門檻，warning 狀態也應該有通用建議
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('建議結構', () => {
    it('should return suggestions with correct structure', () => {
      const fatigue = createFatigue({ ctr_change: -25 });
      const suggestions = getOptimizationSuggestions(fatigue);

      suggestions.forEach((suggestion) => {
        expect(suggestion).toHaveProperty('icon');
        expect(suggestion).toHaveProperty('title');
        expect(suggestion).toHaveProperty('description');
        expect(typeof suggestion.icon).toBe('string');
        expect(typeof suggestion.title).toBe('string');
        expect(typeof suggestion.description).toBe('string');
      });
    });

    it('should return unique suggestions (no duplicates)', () => {
      const fatigue = createFatigue({
        ctr_change: -30,
        frequency: 6,
        days_active: 50,
      });
      const suggestions = getOptimizationSuggestions(fatigue);
      const titles = suggestions.map((s) => s.title);
      const uniqueTitles = [...new Set(titles)];

      expect(titles.length).toBe(uniqueTitles.length);
    });
  });

  describe('邊界情況', () => {
    it('should handle zero values gracefully', () => {
      const fatigue = createFatigue({
        ctr_change: 0,
        frequency: 0,
        days_active: 0,
      });

      expect(() => getOptimizationSuggestions(fatigue)).not.toThrow();
    });

    it('should handle extreme negative CTR change', () => {
      const fatigue = createFatigue({ ctr_change: -100 });
      const suggestions = getOptimizationSuggestions(fatigue);

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very high frequency', () => {
      const fatigue = createFatigue({ frequency: 20 });
      const suggestions = getOptimizationSuggestions(fatigue);

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long days active', () => {
      const fatigue = createFatigue({ days_active: 365 });
      const suggestions = getOptimizationSuggestions(fatigue);

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('fatigued 狀態特殊處理', () => {
    it('should include urgent action suggestion for fatigued status', () => {
      const fatigue = createFatigue({
        score: 80,
        status: 'fatigued',
      });
      const suggestions = getOptimizationSuggestions(fatigue);

      // fatigued 狀態應該有更緊急的建議
      const urgentSuggestion = suggestions.find(
        (s) => s.title.includes('暫停') || s.title.includes('替換')
      );
      expect(urgentSuggestion).toBeDefined();
    });
  });
});
