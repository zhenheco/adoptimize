/**
 * MetricCard 元件測試
 * @module components/dashboard/__tests__/metric-card.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../metric-card';

describe('MetricCard', () => {
  const defaultProps = {
    title: '總花費',
    value: '$1,500.00',
    change: 12.5,
    status: 'normal' as const,
  };

  describe('rendering', () => {
    it('should render title correctly', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('總花費')).toBeDefined();
    });

    it('should render value correctly', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('$1,500.00')).toBeDefined();
    });

    it('should render change percentage', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('+12.5%')).toBeDefined();
    });

    it('should render comparison text', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('vs 上期')).toBeDefined();
    });
  });

  describe('status icons', () => {
    it('should display green status icon for normal status', () => {
      render(<MetricCard {...defaultProps} status="normal" />);
      expect(screen.getByText('🟢')).toBeDefined();
    });

    it('should display yellow status icon for warning status', () => {
      render(<MetricCard {...defaultProps} status="warning" />);
      expect(screen.getByText('🟡')).toBeDefined();
    });

    it('should display red status icon for danger status', () => {
      render(<MetricCard {...defaultProps} status="danger" />);
      expect(screen.getByText('🔴')).toBeDefined();
    });

    it('should have title attribute on status icon', () => {
      render(<MetricCard {...defaultProps} status="warning" />);
      const statusSpan = screen.getByTitle('狀態: warning');
      expect(statusSpan).toBeDefined();
    });
  });

  describe('change indicators', () => {
    it('should show positive change with plus sign', () => {
      render(<MetricCard {...defaultProps} change={15.0} />);
      expect(screen.getByText('+15.0%')).toBeDefined();
    });

    it('should show negative change with minus sign', () => {
      render(<MetricCard {...defaultProps} change={-8.5} />);
      expect(screen.getByText('-8.5%')).toBeDefined();
    });

    it('should show zero change with plus sign', () => {
      render(<MetricCard {...defaultProps} change={0} />);
      expect(screen.getByText('+0.0%')).toBeDefined();
    });

    it('should apply green color for positive change', () => {
      const { container } = render(
        <MetricCard {...defaultProps} change={10} />
      );
      const changeDiv = container.querySelector('.text-green-600');
      expect(changeDiv).toBeDefined();
    });

    it('should apply red color for negative change', () => {
      const { container } = render(
        <MetricCard {...defaultProps} change={-10} />
      );
      const changeDiv = container.querySelector('.text-red-600');
      expect(changeDiv).toBeDefined();
    });

    it('should apply gray color for zero change', () => {
      const { container } = render(<MetricCard {...defaultProps} change={0} />);
      const changeDiv = container.querySelector('.text-gray-500');
      expect(changeDiv).toBeDefined();
    });
  });

  describe('invertChange prop', () => {
    it('should invert positive change to negative styling when invertChange is true', () => {
      // For CPA, increase is bad, so positive change should show red
      const { container } = render(
        <MetricCard
          {...defaultProps}
          title="CPA"
          change={15}
          invertChange={true}
        />
      );
      // With invertChange=true and positive change, it should show red (bad)
      const changeDiv = container.querySelector('.text-red-600');
      expect(changeDiv).toBeDefined();
    });

    it('should invert negative change to positive styling when invertChange is true', () => {
      // For CPA, decrease is good, so negative change should show green
      const { container } = render(
        <MetricCard
          {...defaultProps}
          title="CPA"
          change={-10}
          invertChange={true}
        />
      );
      // With invertChange=true and negative change, it should show green (good)
      const changeDiv = container.querySelector('.text-green-600');
      expect(changeDiv).toBeDefined();
    });

    it('should not affect zero change styling with invertChange', () => {
      const { container } = render(
        <MetricCard {...defaultProps} change={0} invertChange={true} />
      );
      const changeDiv = container.querySelector('.text-gray-500');
      expect(changeDiv).toBeDefined();
    });
  });

  describe('styling', () => {
    it('should have card styling', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('shadow-sm');
    });

    it('should include dark mode classes', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('dark:bg-gray-800');
    });

    it('should have border styling', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-gray-200');
    });
  });

  describe('typography', () => {
    it('should render title with proper styling', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const title = container.querySelector('.text-sm.font-medium');
      expect(title).toBeDefined();
      expect(title?.textContent).toBe('總花費');
    });

    it('should render value with large bold text', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const value = container.querySelector('.text-2xl.font-bold');
      expect(value).toBeDefined();
      expect(value?.textContent).toBe('$1,500.00');
    });
  });

  describe('edge cases', () => {
    it('should handle very large positive change', () => {
      render(<MetricCard {...defaultProps} change={999.9} />);
      expect(screen.getByText('+999.9%')).toBeDefined();
    });

    it('should handle very large negative change', () => {
      render(<MetricCard {...defaultProps} change={-999.9} />);
      expect(screen.getByText('-999.9%')).toBeDefined();
    });

    it('should handle decimal rounding', () => {
      render(<MetricCard {...defaultProps} change={12.567} />);
      expect(screen.getByText('+12.6%')).toBeDefined();
    });

    it('should handle empty string value', () => {
      render(<MetricCard {...defaultProps} value="" />);
      // Should still render without crashing
      expect(screen.getByText('總花費')).toBeDefined();
    });

    it('should handle special characters in value', () => {
      render(<MetricCard {...defaultProps} value="¥1,234,567" />);
      expect(screen.getByText('¥1,234,567')).toBeDefined();
    });

    it('should handle long title', () => {
      render(
        <MetricCard
          {...defaultProps}
          title="每次轉換成本（CPA）"
        />
      );
      expect(screen.getByText('每次轉換成本（CPA）')).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should have status icon with title for screen readers', () => {
      render(<MetricCard {...defaultProps} status="danger" />);
      const statusIcon = screen.getByTitle('狀態: danger');
      expect(statusIcon).toBeDefined();
    });
  });

  /**
   * D-005: Anomaly markers 測試
   * 根據 change 百分比自動判斷異常狀態並顯示警示標記
   *
   * 規則:
   * - change < -20%: danger (紅色警示圖標)
   * - -20% <= change < -10%: warning (黃色警示圖標)
   * - change >= -10%: normal (綠色正常圖標，不顯示警示)
   */
  describe('anomaly markers (D-005)', () => {
    describe('danger anomaly (change < -20%)', () => {
      it('should show danger anomaly icon when change is -25%', () => {
        render(<MetricCard {...defaultProps} change={-25} />);
        const anomalyBadge = screen.getByTestId('anomaly-marker');
        expect(anomalyBadge).toBeDefined();
        expect(anomalyBadge.textContent).toContain('⚠️');
      });

      it('should have danger styling when change is -25%', () => {
        const { container } = render(
          <MetricCard {...defaultProps} change={-25} />
        );
        const dangerBadge = container.querySelector('[data-anomaly="danger"]');
        expect(dangerBadge).toBeDefined();
      });

      it('should show danger anomaly icon when change is -50%', () => {
        render(<MetricCard {...defaultProps} change={-50} />);
        const anomalyBadge = screen.getByTestId('anomaly-marker');
        expect(anomalyBadge).toBeDefined();
      });
    });

    describe('warning anomaly (-20% <= change < -10%)', () => {
      it('should show warning anomaly icon when change is -15%', () => {
        render(<MetricCard {...defaultProps} change={-15} />);
        const anomalyBadge = screen.getByTestId('anomaly-marker');
        expect(anomalyBadge).toBeDefined();
        expect(anomalyBadge.textContent).toContain('⚡');
      });

      it('should have warning styling when change is -15%', () => {
        const { container } = render(
          <MetricCard {...defaultProps} change={-15} />
        );
        const warningBadge = container.querySelector('[data-anomaly="warning"]');
        expect(warningBadge).toBeDefined();
      });

      it('should show warning anomaly icon when change is -20% (boundary)', () => {
        render(<MetricCard {...defaultProps} change={-20} />);
        const anomalyBadge = screen.getByTestId('anomaly-marker');
        expect(anomalyBadge).toBeDefined();
      });
    });

    describe('normal (no anomaly marker for change >= -10%)', () => {
      it('should not show anomaly marker when change is -5%', () => {
        render(<MetricCard {...defaultProps} change={-5} />);
        const anomalyBadge = screen.queryByTestId('anomaly-marker');
        expect(anomalyBadge).toBeNull();
      });

      it('should not show anomaly marker when change is -10% (boundary)', () => {
        render(<MetricCard {...defaultProps} change={-10} />);
        const anomalyBadge = screen.queryByTestId('anomaly-marker');
        expect(anomalyBadge).toBeNull();
      });

      it('should not show anomaly marker when change is 0%', () => {
        render(<MetricCard {...defaultProps} change={0} />);
        const anomalyBadge = screen.queryByTestId('anomaly-marker');
        expect(anomalyBadge).toBeNull();
      });

      it('should not show anomaly marker when change is positive (+10%)', () => {
        render(<MetricCard {...defaultProps} change={10} />);
        const anomalyBadge = screen.queryByTestId('anomaly-marker');
        expect(anomalyBadge).toBeNull();
      });
    });

    describe('anomaly marker accessibility', () => {
      it('should have accessible title for danger anomaly', () => {
        render(<MetricCard {...defaultProps} change={-25} />);
        const anomalyBadge = screen.getByTitle('異常警示: 嚴重下降');
        expect(anomalyBadge).toBeDefined();
      });

      it('should have accessible title for warning anomaly', () => {
        render(<MetricCard {...defaultProps} change={-15} />);
        const anomalyBadge = screen.getByTitle('異常警示: 中度下降');
        expect(anomalyBadge).toBeDefined();
      });
    });
  });
});
