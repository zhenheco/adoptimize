/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  BatchRecommendationDialog,
  type BatchRecommendationAction,
} from '../batch-recommendation-dialog';
import type { Recommendation } from '@/lib/api/types';
import '@testing-library/jest-dom';

// 建立測試用的 recommendations
const createMockRecommendations = (): Recommendation[] => [
  {
    id: 'rec-1',
    type: 'PAUSE_CREATIVE',
    priority_score: 150,
    title: '暫停疲勞素材 A',
    description: '素材已疲勞',
    action_module: 'pause_creative',
    estimated_impact: 500,
    status: 'pending',
  },
  {
    id: 'rec-2',
    type: 'REDUCE_BUDGET',
    priority_score: 100,
    title: '降低低效預算',
    description: '預算效率不佳',
    action_module: 'adjust_budget',
    estimated_impact: 300,
    status: 'pending',
  },
  {
    id: 'rec-3',
    type: 'EXCLUDE_AUDIENCE',
    priority_score: 80,
    title: '排除重疊受眾',
    description: '受眾重疊率過高',
    action_module: 'exclude_audience',
    estimated_impact: 200,
    status: 'pending',
  },
];

describe('BatchRecommendationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    action: 'execute' as BatchRecommendationAction,
    items: createMockRecommendations(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('對話框標題', () => {
    it('should display execute title for execute action', () => {
      render(<BatchRecommendationDialog {...defaultProps} action="execute" />);
      expect(screen.getByText('確認批次執行')).toBeInTheDocument();
    });

    it('should display ignore title for ignore action', () => {
      render(<BatchRecommendationDialog {...defaultProps} action="ignore" />);
      expect(screen.getByText('確認批次忽略')).toBeInTheDocument();
    });
  });

  describe('項目數量顯示', () => {
    it('should display correct item count', () => {
      render(<BatchRecommendationDialog {...defaultProps} />);
      expect(screen.getByText(/3 個建議/)).toBeInTheDocument();
    });

    it('should display message when no items', () => {
      render(<BatchRecommendationDialog {...defaultProps} items={[]} />);
      expect(screen.getByText('沒有選取任何建議')).toBeInTheDocument();
    });
  });

  describe('項目列表', () => {
    it('should list all selected recommendations', () => {
      render(<BatchRecommendationDialog {...defaultProps} />);

      expect(screen.getByText('暫停疲勞素材 A')).toBeInTheDocument();
      expect(screen.getByText('降低低效預算')).toBeInTheDocument();
      expect(screen.getByText('排除重疊受眾')).toBeInTheDocument();
    });

    it('should show estimated impact for each item', () => {
      render(<BatchRecommendationDialog {...defaultProps} />);

      // 應該顯示每個項目的預估影響
      expect(screen.getByText(/\$500/)).toBeInTheDocument();
      expect(screen.getByText(/\$300/)).toBeInTheDocument();
      expect(screen.getByText(/\$200/)).toBeInTheDocument();
    });
  });

  describe('總預估影響', () => {
    it('should display total estimated impact', () => {
      render(<BatchRecommendationDialog {...defaultProps} />);
      // 500 + 300 + 200 = 1000
      expect(screen.getByText(/\$1,000/)).toBeInTheDocument();
    });
  });

  describe('確認按鈕', () => {
    it('should show execute button text for execute action', () => {
      render(<BatchRecommendationDialog {...defaultProps} action="execute" />);
      expect(screen.getByRole('button', { name: /執行/ })).toBeInTheDocument();
    });

    it('should show ignore button text for ignore action', () => {
      render(<BatchRecommendationDialog {...defaultProps} action="ignore" />);
      expect(screen.getByRole('button', { name: /忽略/ })).toBeInTheDocument();
    });

    it('should call onConfirm when confirm button clicked', async () => {
      const onConfirm = vi.fn();
      render(
        <BatchRecommendationDialog {...defaultProps} onConfirm={onConfirm} />
      );

      fireEvent.click(screen.getByRole('button', { name: /執行/ }));

      expect(onConfirm).toHaveBeenCalled();
    });

    it('should be disabled when items are empty', () => {
      render(<BatchRecommendationDialog {...defaultProps} items={[]} />);
      expect(screen.getByRole('button', { name: /執行/ })).toBeDisabled();
    });

    it('should be disabled when loading', () => {
      render(<BatchRecommendationDialog {...defaultProps} isLoading />);
      expect(screen.getByRole('button', { name: /處理中/ })).toBeDisabled();
    });
  });

  describe('取消按鈕', () => {
    it('should close dialog when cancel clicked', () => {
      const onOpenChange = vi.fn();
      render(
        <BatchRecommendationDialog
          {...defaultProps}
          onOpenChange={onOpenChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '取消' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should be disabled when loading', () => {
      render(<BatchRecommendationDialog {...defaultProps} isLoading />);
      expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    });
  });

  describe('載入狀態', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<BatchRecommendationDialog {...defaultProps} isLoading />);
      expect(screen.getByText('處理中...')).toBeInTheDocument();
    });
  });

  describe('錯誤顯示', () => {
    it('should display error message when error is provided', () => {
      render(
        <BatchRecommendationDialog
          {...defaultProps}
          error="批次執行失敗：API 錯誤"
        />
      );
      expect(screen.getByText('批次執行失敗：API 錯誤')).toBeInTheDocument();
    });

    it('should have alert role for error message', () => {
      render(<BatchRecommendationDialog {...defaultProps} error="錯誤訊息" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('進度顯示', () => {
    it('should display progress when provided', () => {
      render(
        <BatchRecommendationDialog
          {...defaultProps}
          isLoading
          progress={{ current: 2, total: 3 }}
        />
      );
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
  });
});
