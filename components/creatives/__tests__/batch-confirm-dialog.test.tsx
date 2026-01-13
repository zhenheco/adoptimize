/**
 * @vitest-environment jsdom
 *
 * BatchConfirmDialog 元件測試
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchConfirmDialog } from '../batch-confirm-dialog';
import type { Creative } from '@/lib/api/types';

// 模擬 Creative 資料
const mockCreatives: Creative[] = [
  {
    id: 'creative-1',
    name: 'Creative 1',
    type: 'IMAGE',
    thumbnail_url: 'https://example.com/img1.jpg',
    metrics: { impressions: 1000, clicks: 50, ctr: 0.05, conversions: 10, spend: 100 },
    fatigue: { score: 30, status: 'healthy', ctr_change: -5, frequency: 2, days_active: 10 },
    status: 'active',
  },
  {
    id: 'creative-2',
    name: 'Creative 2',
    type: 'VIDEO',
    thumbnail_url: 'https://example.com/img2.jpg',
    metrics: { impressions: 2000, clicks: 100, ctr: 0.05, conversions: 20, spend: 200 },
    fatigue: { score: 60, status: 'warning', ctr_change: -15, frequency: 4, days_active: 25 },
    status: 'active',
  },
];

describe('BatchConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    action: 'pause' as const,
    items: mockCreatives,
    onConfirm: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('顯示與隱藏', () => {
    it('should render dialog when open is true', () => {
      render(<BatchConfirmDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render dialog when open is false', () => {
      render(<BatchConfirmDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('暫停操作', () => {
    it('should show pause title', () => {
      render(<BatchConfirmDialog {...defaultProps} action="pause" />);

      expect(screen.getByText('確認批次暫停')).toBeInTheDocument();
    });

    it('should show pause description with count', () => {
      render(<BatchConfirmDialog {...defaultProps} action="pause" />);

      expect(screen.getByText(/確定要暫停以下 2 個素材嗎/)).toBeInTheDocument();
    });

    it('should show pause button', () => {
      render(<BatchConfirmDialog {...defaultProps} action="pause" />);

      expect(screen.getByRole('button', { name: /暫停/ })).toBeInTheDocument();
    });
  });

  describe('啟用操作', () => {
    it('should show enable title', () => {
      render(<BatchConfirmDialog {...defaultProps} action="enable" />);

      expect(screen.getByText('確認批次啟用')).toBeInTheDocument();
    });

    it('should show enable description with count', () => {
      render(<BatchConfirmDialog {...defaultProps} action="enable" />);

      expect(screen.getByText(/確定要啟用以下 2 個素材嗎/)).toBeInTheDocument();
    });

    it('should show enable button', () => {
      render(<BatchConfirmDialog {...defaultProps} action="enable" />);

      expect(screen.getByRole('button', { name: /啟用/ })).toBeInTheDocument();
    });
  });

  describe('素材列表', () => {
    it('should display all selected item names', () => {
      render(<BatchConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Creative 1')).toBeInTheDocument();
      expect(screen.getByText('Creative 2')).toBeInTheDocument();
    });

    it('should display item types', () => {
      render(<BatchConfirmDialog {...defaultProps} />);

      expect(screen.getByText(/IMAGE/)).toBeInTheDocument();
      expect(screen.getByText(/VIDEO/)).toBeInTheDocument();
    });
  });

  describe('操作按鈕', () => {
    it('should call onOpenChange when cancel is clicked', () => {
      const onOpenChange = vi.fn();
      render(<BatchConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: '取消' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onConfirm when confirm is clicked', () => {
      const onConfirm = vi.fn();
      render(<BatchConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: /暫停/ }));

      expect(onConfirm).toHaveBeenCalled();
    });

    it('should disable buttons when loading', () => {
      render(<BatchConfirmDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /處理中/ })).toBeDisabled();
    });

    it('should show loading text when loading', () => {
      render(<BatchConfirmDialog {...defaultProps} isLoading={true} />);

      expect(screen.getByText('處理中...')).toBeInTheDocument();
    });
  });

  describe('錯誤處理', () => {
    it('should display error message when provided', () => {
      render(<BatchConfirmDialog {...defaultProps} error="批次操作失敗" />);

      expect(screen.getByText('批次操作失敗')).toBeInTheDocument();
    });

    it('should not display error when not provided', () => {
      render(<BatchConfirmDialog {...defaultProps} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('空列表處理', () => {
    it('should show empty message when no items', () => {
      render(<BatchConfirmDialog {...defaultProps} items={[]} />);

      expect(screen.getByText('沒有選取任何素材')).toBeInTheDocument();
    });

    it('should disable confirm button when no items', () => {
      render(<BatchConfirmDialog {...defaultProps} items={[]} />);

      expect(screen.getByRole('button', { name: /暫停/ })).toBeDisabled();
    });
  });
});
