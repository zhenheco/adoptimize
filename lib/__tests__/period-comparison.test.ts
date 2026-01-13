import { describe, it, expect } from 'vitest';
import {
  calculatePeriodChange,
  getPeriodLabel,
  getPreviousPeriodLabel,
  formatPeriodComparison,
  type PeriodComparisonData,
  type ComparisonMetric,
} from '../utils/period-comparison';

describe('Period Comparison Utilities', () => {
  describe('calculatePeriodChange', () => {
    it('should calculate positive percentage change correctly', () => {
      // 前期: 100, 當期: 120 => +20%
      const result = calculatePeriodChange(120, 100);
      expect(result).toBe(20);
    });

    it('should calculate negative percentage change correctly', () => {
      // 前期: 100, 當期: 80 => -20%
      const result = calculatePeriodChange(80, 100);
      expect(result).toBe(-20);
    });

    it('should return 0 when no change', () => {
      const result = calculatePeriodChange(100, 100);
      expect(result).toBe(0);
    });

    it('should handle zero previous value gracefully', () => {
      // 當前期有值但前期為 0，應視為 100% 增長
      const result = calculatePeriodChange(100, 0);
      expect(result).toBe(100);
    });

    it('should handle both zero values', () => {
      const result = calculatePeriodChange(0, 0);
      expect(result).toBe(0);
    });

    it('should round to one decimal place', () => {
      // 前期: 100, 當期: 115.5 => 15.5%
      const result = calculatePeriodChange(115.5, 100);
      expect(result).toBe(15.5);
    });

    it('should handle very small changes correctly', () => {
      // 前期: 1000, 當期: 1001 => 0.1%
      const result = calculatePeriodChange(1001, 1000);
      expect(result).toBe(0.1);
    });

    it('should handle large percentage changes', () => {
      // 前期: 50, 當期: 200 => +300%
      const result = calculatePeriodChange(200, 50);
      expect(result).toBe(300);
    });
  });

  describe('getPeriodLabel', () => {
    it('should return correct label for 7d period', () => {
      expect(getPeriodLabel('7d')).toBe('過去 7 天');
    });

    it('should return correct label for 30d period', () => {
      expect(getPeriodLabel('30d')).toBe('過去 30 天');
    });

    it('should return correct label for today', () => {
      expect(getPeriodLabel('today')).toBe('今日');
    });

    it('should return correct label for custom period', () => {
      expect(getPeriodLabel('custom')).toBe('自訂範圍');
    });
  });

  describe('getPreviousPeriodLabel', () => {
    it('should return previous period label for 7d', () => {
      expect(getPreviousPeriodLabel('7d')).toBe('前 7 天');
    });

    it('should return previous period label for 30d', () => {
      expect(getPreviousPeriodLabel('30d')).toBe('前 30 天');
    });

    it('should return previous period label for today', () => {
      expect(getPreviousPeriodLabel('today')).toBe('昨日');
    });

    it('should return previous period label for custom', () => {
      expect(getPreviousPeriodLabel('custom')).toBe('同期');
    });
  });

  describe('formatPeriodComparison', () => {
    it('should format positive change with up arrow', () => {
      const result = formatPeriodComparison(15.5);
      expect(result.formattedChange).toBe('+15.5%');
      expect(result.direction).toBe('up');
      expect(result.colorClass).toContain('green');
    });

    it('should format negative change with down arrow', () => {
      const result = formatPeriodComparison(-12.3);
      expect(result.formattedChange).toBe('-12.3%');
      expect(result.direction).toBe('down');
      expect(result.colorClass).toContain('red');
    });

    it('should format zero change as neutral', () => {
      const result = formatPeriodComparison(0);
      expect(result.formattedChange).toBe('0.0%');
      expect(result.direction).toBe('neutral');
      expect(result.colorClass).toContain('gray');
    });

    it('should handle inverted metrics (CPA) - negative is good', () => {
      // 對於 CPA 這類指標，下降是好事
      const result = formatPeriodComparison(-10, true);
      expect(result.formattedChange).toBe('-10.0%');
      expect(result.direction).toBe('down');
      expect(result.colorClass).toContain('green'); // 綠色表示好
    });

    it('should handle inverted metrics (CPA) - positive is bad', () => {
      // 對於 CPA 這類指標，上升是壞事
      const result = formatPeriodComparison(10, true);
      expect(result.formattedChange).toBe('+10.0%');
      expect(result.direction).toBe('up');
      expect(result.colorClass).toContain('red'); // 紅色表示不好
    });

    it('should cap display at 999.9% for extremely large changes', () => {
      const result = formatPeriodComparison(1500);
      expect(result.formattedChange).toBe('+999.9%');
    });

    it('should handle -100% change', () => {
      const result = formatPeriodComparison(-100);
      expect(result.formattedChange).toBe('-100.0%');
    });
  });

  describe('PeriodComparisonData type', () => {
    it('should properly type current and previous period data', () => {
      const data: PeriodComparisonData = {
        period: '7d',
        currentPeriod: {
          start: '2024-12-25',
          end: '2024-12-31',
        },
        previousPeriod: {
          start: '2024-12-18',
          end: '2024-12-24',
        },
        metrics: {
          spend: { current: 1500, previous: 1200 },
          impressions: { current: 50000, previous: 45000 },
          clicks: { current: 2500, previous: 2300 },
          conversions: { current: 150, previous: 120 },
          cpa: { current: 10, previous: 12 },
          roas: { current: 3.5, previous: 3.0 },
        },
      };

      expect(data.period).toBe('7d');
      expect(data.currentPeriod.start).toBe('2024-12-25');
      expect(data.metrics.spend.current).toBe(1500);
    });
  });

  describe('ComparisonMetric type', () => {
    it('should properly type metric comparison data', () => {
      const metric: ComparisonMetric = {
        current: 100,
        previous: 80,
      };

      expect(metric.current).toBe(100);
      expect(metric.previous).toBe(80);
    });
  });
});
