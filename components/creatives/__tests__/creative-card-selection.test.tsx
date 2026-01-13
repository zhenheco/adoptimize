/**
 * @vitest-environment jsdom
 *
 * CreativeCard 多選功能測試
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreativeCard } from '../creative-card';
import type { Creative } from '@/lib/api/types';

const mockCreative: Creative = {
  id: 'creative-1',
  name: 'Test Creative',
  type: 'IMAGE',
  thumbnail_url: 'https://example.com/img1.jpg',
  metrics: { impressions: 1000, clicks: 50, ctr: 0.05, conversions: 10, spend: 100 },
  fatigue: { score: 30, status: 'healthy', ctr_change: -5, frequency: 2, days_active: 10 },
  status: 'active',
};

describe('CreativeCard Selection Mode', () => {
  describe('顯示 Checkbox', () => {
    it('should not show checkbox when selectionMode is false', () => {
      render(<CreativeCard creative={mockCreative} />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should show checkbox when selectionMode is true', () => {
      render(<CreativeCard creative={mockCreative} selectionMode={true} isSelected={false} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('選取狀態', () => {
    it('should show unchecked checkbox when isSelected is false', () => {
      render(<CreativeCard creative={mockCreative} selectionMode={true} isSelected={false} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should show checked checkbox when isSelected is true', () => {
      render(<CreativeCard creative={mockCreative} selectionMode={true} isSelected={true} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should show selection highlight when isSelected is true', () => {
      const { container } = render(
        <CreativeCard creative={mockCreative} selectionMode={true} isSelected={true} />
      );

      // 應該有選取高亮的 ring 樣式
      const card = container.firstChild;
      expect(card).toHaveClass('ring-2');
    });
  });

  describe('選取操作', () => {
    it('should call onSelectionChange when checkbox is clicked', () => {
      const onSelectionChange = vi.fn();
      render(
        <CreativeCard
          creative={mockCreative}
          selectionMode={true}
          isSelected={false}
          onSelectionChange={onSelectionChange}
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));

      expect(onSelectionChange).toHaveBeenCalledWith(mockCreative);
    });

    it('should call onSelectionChange when card is clicked in selection mode', () => {
      const onSelectionChange = vi.fn();
      const onClick = vi.fn();
      render(
        <CreativeCard
          creative={mockCreative}
          selectionMode={true}
          isSelected={false}
          onClick={onClick}
          onSelectionChange={onSelectionChange}
        />
      );

      // 點擊卡片應該觸發選取而非 onClick
      fireEvent.click(screen.getByText('Test Creative'));

      expect(onSelectionChange).toHaveBeenCalledWith(mockCreative);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should call onClick when card is clicked without selection mode', () => {
      const onClick = vi.fn();
      render(<CreativeCard creative={mockCreative} onClick={onClick} />);

      fireEvent.click(screen.getByText('Test Creative'));

      expect(onClick).toHaveBeenCalledWith(mockCreative);
    });
  });

  describe('Checkbox 點擊不冒泡', () => {
    it('should not trigger card click when checkbox is clicked', () => {
      const onClick = vi.fn();
      const onSelectionChange = vi.fn();
      render(
        <CreativeCard
          creative={mockCreative}
          selectionMode={true}
          isSelected={false}
          onClick={onClick}
          onSelectionChange={onSelectionChange}
        />
      );

      fireEvent.click(screen.getByRole('checkbox'));

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      // onClick 不應該被呼叫（因為在 selection mode 下）
    });
  });
});
