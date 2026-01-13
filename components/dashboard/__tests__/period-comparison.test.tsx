import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PeriodComparison, type PeriodComparisonProps } from '../period-comparison';

/**
 * PeriodComparison 元件測試
 *
 * 驗收標準:
 * - AC1: 顯示 vs 上期 比較數據
 * - AC2: 支援 7D vs 7D、30D vs 30D 比較
 * - AC3: 差異使用箭頭+百分比顯示
 */
describe('PeriodComparison', () => {
  const defaultProps: PeriodComparisonProps = {
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

  describe('AC1: 顯示 vs 上期 比較數據', () => {
    it('should render period comparison header', () => {
      render(<PeriodComparison {...defaultProps} />);
      expect(screen.getByText(/vs 前 7 天/)).toBeDefined();
    });

    it('should display comparison for all 6 metrics', () => {
      render(<PeriodComparison {...defaultProps} />);

      // 檢查所有指標標籤
      expect(screen.getByText('總花費')).toBeDefined();
      expect(screen.getByText('曝光')).toBeDefined();
      expect(screen.getByText('點擊')).toBeDefined();
      expect(screen.getByText('轉換')).toBeDefined();
      expect(screen.getByText('CPA')).toBeDefined();
      expect(screen.getByText('ROAS')).toBeDefined();
    });

    it('should show current and previous values', () => {
      render(<PeriodComparison {...defaultProps} />);

      // Spend: $1,500 vs $1,200
      expect(screen.getByText('$1,500')).toBeDefined();
      expect(screen.getByText('$1,200')).toBeDefined();
    });
  });

  describe('AC2: 支援 7D vs 7D、30D vs 30D 比較', () => {
    it('should show "vs 前 7 天" for 7d period', () => {
      render(<PeriodComparison {...defaultProps} period="7d" />);
      expect(screen.getByText(/vs 前 7 天/)).toBeDefined();
    });

    it('should show "vs 前 30 天" for 30d period', () => {
      render(<PeriodComparison {...defaultProps} period="30d" />);
      expect(screen.getByText(/vs 前 30 天/)).toBeDefined();
    });

    it('should show "vs 昨日" for today period', () => {
      render(<PeriodComparison {...defaultProps} period="today" />);
      expect(screen.getByText(/vs 昨日/)).toBeDefined();
    });

    it('should display date range for current period', () => {
      render(<PeriodComparison {...defaultProps} />);
      expect(screen.getByText(/12\/25 - 12\/31/)).toBeDefined();
    });

    it('should display date range for previous period', () => {
      render(<PeriodComparison {...defaultProps} />);
      expect(screen.getByText(/12\/18 - 12\/24/)).toBeDefined();
    });
  });

  describe('AC3: 差異使用箭頭+百分比顯示', () => {
    it('should show up arrow for positive change', () => {
      render(<PeriodComparison {...defaultProps} />);

      // Spend increased 25%: (1500-1200)/1200 = 25%
      const spendChange = screen.getByTestId('spend-change');
      expect(spendChange.textContent).toContain('+25.0%');
      expect(spendChange.querySelector('[data-direction="up"]')).toBeDefined();
    });

    it('should show down arrow for negative change', () => {
      const propsWithDecrease = {
        ...defaultProps,
        metrics: {
          ...defaultProps.metrics,
          impressions: { current: 40000, previous: 50000 }, // -20%
        },
      };
      render(<PeriodComparison {...propsWithDecrease} />);

      const impressionsChange = screen.getByTestId('impressions-change');
      expect(impressionsChange.textContent).toContain('-20.0%');
      expect(impressionsChange.querySelector('[data-direction="down"]')).toBeDefined();
    });

    it('should use green color for positive changes (non-CPA)', () => {
      render(<PeriodComparison {...defaultProps} />);

      const spendChange = screen.getByTestId('spend-change');
      expect(spendChange.className).toContain('text-green-600');
    });

    it('should use red color for negative changes (non-CPA)', () => {
      const propsWithDecrease = {
        ...defaultProps,
        metrics: {
          ...defaultProps.metrics,
          clicks: { current: 2000, previous: 2500 }, // -20%
        },
      };
      render(<PeriodComparison {...propsWithDecrease} />);

      const clicksChange = screen.getByTestId('clicks-change');
      expect(clicksChange.className).toContain('text-red-600');
    });

    it('should invert colors for CPA (decrease is good)', () => {
      render(<PeriodComparison {...defaultProps} />);

      // CPA decreased from 12 to 10 = -16.7%, which is GOOD
      const cpaChange = screen.getByTestId('cpa-change');
      expect(cpaChange.textContent).toContain('-16.7%');
      expect(cpaChange.className).toContain('text-green-600'); // Green because CPA down is good
    });

    it('should show neutral style for zero change', () => {
      const propsWithNoChange = {
        ...defaultProps,
        metrics: {
          ...defaultProps.metrics,
          conversions: { current: 100, previous: 100 }, // 0%
        },
      };
      render(<PeriodComparison {...propsWithNoChange} />);

      const conversionsChange = screen.getByTestId('conversions-change');
      expect(conversionsChange.textContent).toContain('0.0%');
      expect(conversionsChange.className).toContain('text-gray-500');
    });
  });

  describe('Layout and styling', () => {
    it('should render in a card container', () => {
      render(<PeriodComparison {...defaultProps} />);
      const container = screen.getByTestId('period-comparison');
      expect(container.className).toContain('rounded-lg');
    });

    it('should render metrics in grid layout', () => {
      render(<PeriodComparison {...defaultProps} />);
      const grid = screen.getByTestId('metrics-grid');
      expect(grid.className).toContain('grid');
    });

    it('should be accessible with proper labels', () => {
      render(<PeriodComparison {...defaultProps} />);

      // Check for accessible labels
      expect(screen.getByRole('heading', { name: /期間比較/ })).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero previous value gracefully', () => {
      const propsWithZeroPrevious = {
        ...defaultProps,
        metrics: {
          ...defaultProps.metrics,
          conversions: { current: 100, previous: 0 }, // division by zero case
        },
      };
      render(<PeriodComparison {...propsWithZeroPrevious} />);

      const conversionsChange = screen.getByTestId('conversions-change');
      expect(conversionsChange.textContent).toContain('+100.0%');
    });

    it('should handle both zero values', () => {
      const propsWithBothZero = {
        ...defaultProps,
        metrics: {
          ...defaultProps.metrics,
          clicks: { current: 0, previous: 0 },
        },
      };
      render(<PeriodComparison {...propsWithBothZero} />);

      const clicksChange = screen.getByTestId('clicks-change');
      expect(clicksChange.textContent).toContain('0.0%');
    });

    it('should cap extremely large percentage changes', () => {
      const propsWithHugeChange = {
        ...defaultProps,
        metrics: {
          ...defaultProps.metrics,
          impressions: { current: 100000, previous: 1 }, // 9,999,900% change
        },
      };
      render(<PeriodComparison {...propsWithHugeChange} />);

      const impressionsChange = screen.getByTestId('impressions-change');
      expect(impressionsChange.textContent).toContain('+999.9%');
    });
  });
});
