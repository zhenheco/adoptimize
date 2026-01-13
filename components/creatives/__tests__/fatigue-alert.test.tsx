/**
 * FatigueAlert 元件測試
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FatigueAlert } from '../fatigue-alert';
import type { CreativeFatigue } from '@/lib/api/types';

// 測試用的疲勞資料工廠
function createFatigue(overrides: Partial<CreativeFatigue> = {}): CreativeFatigue {
  return {
    score: 50,
    status: 'warning',
    ctr_change: -10,
    frequency: 3,
    days_active: 14,
    ...overrides,
  };
}

describe('FatigueAlert', () => {
  describe('AC1: 疲勞度 > 70 時顯示紅色 banner', () => {
    it('should show red danger banner when score is 75', () => {
      const fatigue = createFatigue({ score: 75, status: 'fatigued' });
      render(<FatigueAlert fatigue={fatigue} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      // 紅色 banner 應該有 danger 樣式
      expect(alert.className).toContain('bg-red-50');
    });

    it('should show red danger banner when score is 100', () => {
      const fatigue = createFatigue({ score: 100, status: 'fatigued' });
      render(<FatigueAlert fatigue={fatigue} />);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-red-50');
    });

    it('should show red danger banner when score is exactly 71', () => {
      const fatigue = createFatigue({ score: 71, status: 'fatigued' });
      render(<FatigueAlert fatigue={fatigue} />);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-red-50');
    });

    it('should display urgent action message for fatigued status', () => {
      const fatigue = createFatigue({ score: 85, status: 'fatigued' });
      render(<FatigueAlert fatigue={fatigue} />);

      expect(screen.getByText(/立即更換素材/)).toBeDefined();
    });

    it('should show alert icon for danger level', () => {
      const fatigue = createFatigue({ score: 80, status: 'fatigued' });
      render(<FatigueAlert fatigue={fatigue} />);

      // 應該顯示警告圖示
      expect(screen.getByTestId('fatigue-alert-icon')).toBeDefined();
    });
  });

  describe('AC2: 疲勞度 40-70 時顯示黃色提示', () => {
    it('should show yellow warning alert when score is 50', () => {
      const fatigue = createFatigue({ score: 50, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-yellow-50');
    });

    it('should show yellow warning alert when score is 41', () => {
      const fatigue = createFatigue({ score: 41, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-yellow-50');
    });

    it('should show yellow warning alert when score is 70', () => {
      const fatigue = createFatigue({ score: 70, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-yellow-50');
    });

    it('should display preparation message for warning status', () => {
      const fatigue = createFatigue({ score: 55, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      expect(screen.getByText(/準備替換素材/)).toBeDefined();
    });
  });

  describe('AC3: 點擊可展開詳細建議', () => {
    it('should not show details by default', () => {
      const fatigue = createFatigue({ score: 60, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      // 詳細建議預設不顯示
      expect(screen.queryByTestId('fatigue-details')).toBeNull();
    });

    it('should show expand button', () => {
      const fatigue = createFatigue({ score: 60, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      expect(screen.getByRole('button', { name: /查看建議/i })).toBeDefined();
    });

    it('should expand details when button is clicked', () => {
      const fatigue = createFatigue({ score: 60, status: 'warning', ctr_change: -15 });
      render(<FatigueAlert fatigue={fatigue} />);

      const expandButton = screen.getByRole('button', { name: /查看建議/i });
      fireEvent.click(expandButton);

      expect(screen.getByTestId('fatigue-details')).toBeDefined();
    });

    it('should collapse details when button is clicked again', () => {
      const fatigue = createFatigue({ score: 60, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      const expandButton = screen.getByRole('button', { name: /查看建議/i });
      fireEvent.click(expandButton);

      // 收合按鈕
      const collapseButton = screen.getByRole('button', { name: /收起/i });
      fireEvent.click(collapseButton);

      expect(screen.queryByTestId('fatigue-details')).toBeNull();
    });

    it('should show CTR-related suggestion when CTR is dropping', () => {
      const fatigue = createFatigue({
        score: 65,
        status: 'warning',
        ctr_change: -20
      });
      render(<FatigueAlert fatigue={fatigue} />);

      fireEvent.click(screen.getByRole('button', { name: /查看建議/i }));

      expect(screen.getByText(/更新視覺/)).toBeDefined();
    });

    it('should show frequency-related suggestion when frequency is high', () => {
      const fatigue = createFatigue({
        score: 65,
        status: 'warning',
        frequency: 4.5
      });
      render(<FatigueAlert fatigue={fatigue} />);

      fireEvent.click(screen.getByRole('button', { name: /查看建議/i }));

      expect(screen.getByText(/擴大受眾/)).toBeDefined();
    });

    it('should show days-related suggestion when active too long', () => {
      const fatigue = createFatigue({
        score: 65,
        status: 'warning',
        days_active: 35
      });
      render(<FatigueAlert fatigue={fatigue} />);

      fireEvent.click(screen.getByRole('button', { name: /查看建議/i }));

      expect(screen.getByText(/輪換素材/)).toBeDefined();
    });
  });

  describe('健康狀態時不顯示', () => {
    it('should not render anything when score is 40 or below', () => {
      const fatigue = createFatigue({ score: 40, status: 'healthy' });
      const { container } = render(<FatigueAlert fatigue={fatigue} />);

      expect(container.innerHTML).toBe('');
    });

    it('should not render anything when score is 0', () => {
      const fatigue = createFatigue({ score: 0, status: 'healthy' });
      const { container } = render(<FatigueAlert fatigue={fatigue} />);

      expect(container.innerHTML).toBe('');
    });

    it('should not render anything when score is 25', () => {
      const fatigue = createFatigue({ score: 25, status: 'healthy' });
      const { container } = render(<FatigueAlert fatigue={fatigue} />);

      expect(container.innerHTML).toBe('');
    });
  });

  describe('邊界情況', () => {
    it('should handle edge case of score exactly 40 as healthy (no alert)', () => {
      const fatigue = createFatigue({ score: 40, status: 'healthy' });
      const { container } = render(<FatigueAlert fatigue={fatigue} />);

      expect(container.innerHTML).toBe('');
    });

    it('should show warning at score 41', () => {
      const fatigue = createFatigue({ score: 41, status: 'warning' });
      render(<FatigueAlert fatigue={fatigue} />);

      expect(screen.getByRole('alert').className).toContain('bg-yellow-50');
    });

    it('should handle all factors being problematic', () => {
      const fatigue = createFatigue({
        score: 90,
        status: 'fatigued',
        ctr_change: -30,
        frequency: 5,
        days_active: 45
      });
      render(<FatigueAlert fatigue={fatigue} />);

      fireEvent.click(screen.getByRole('button', { name: /查看建議/i }));

      // 應該顯示多個建議
      const details = screen.getByTestId('fatigue-details');
      const suggestions = details.querySelectorAll('[data-testid="suggestion-item"]');
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('無障礙性', () => {
    it('should have proper role="alert" for screen readers', () => {
      const fatigue = createFatigue({ score: 75, status: 'fatigued' });
      render(<FatigueAlert fatigue={fatigue} />);

      expect(screen.getByRole('alert')).toBeDefined();
    });

    it('should have descriptive aria-label', () => {
      const fatigue = createFatigue({ score: 75, status: 'fatigued' });
      render(<FatigueAlert fatigue={fatigue} />);

      const alert = screen.getByRole('alert');
      expect(alert.getAttribute('aria-label')).toContain('疲勞');
    });
  });
});
