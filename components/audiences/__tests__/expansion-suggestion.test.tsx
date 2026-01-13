/**
 * ExpansionSuggestion 元件測試
 *
 * A-006: Expansion Suggestions
 * - AC1: 小受眾建議 Lookalike 擴展
 * - AC2: 顯示建議的相似度百分比
 * - AC3: 預估新增觸及數
 *
 * TDD 🔴 Red Phase: 先寫測試
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpansionSuggestion } from '../expansion-suggestion';
import type { Audience } from '@/lib/api/types';
import '@testing-library/jest-dom';

describe('ExpansionSuggestion', () => {
  // 高效能小受眾（應建議擴展）
  const highPerformingSmall: Audience = {
    id: 'aud-hp-1',
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

  // 普通小受眾
  const regularSmallAudience: Audience = {
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

  // 中等規模受眾（不應建議擴展）
  const mediumAudience: Audience = {
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

  // Lookalike 受眾（不應建議擴展）
  const lookalikeAudience: Audience = {
    id: 'aud-lookalike-1',
    name: 'Lookalike 1% - VIP',
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

  describe('rendering', () => {
    it('should render suggestion card for small audience', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('expansion-suggestion')).toBeInTheDocument();
      expect(screen.getByText(/擴展建議/)).toBeInTheDocument();
    });

    it('should display source audience name', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      // 受眾名稱會出現在多處（來源受眾區塊、原因說明、步驟中）
      const elements = screen.getAllByText(/超級購買者/);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should show current audience size', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('current-size')).toHaveTextContent(/2,000/);
    });

    it('should show priority badge', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      // 高效能小受眾 = high priority
      expect(screen.getByTestId('priority-badge')).toBeInTheDocument();
    });

    it('should not render for medium audience', () => {
      render(<ExpansionSuggestion audience={mediumAudience} />);

      expect(screen.queryByTestId('expansion-suggestion')).not.toBeInTheDocument();
    });

    it('should not render for lookalike audience', () => {
      render(<ExpansionSuggestion audience={lookalikeAudience} />);

      expect(screen.queryByTestId('expansion-suggestion')).not.toBeInTheDocument();
    });
  });

  describe('similarity percentage display (AC2)', () => {
    it('should display recommended similarity percentages', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      // 高效能受眾應該建議 1-2%
      expect(screen.getByTestId('recommended-percentages')).toBeInTheDocument();
    });

    it('should show 1% as primary recommendation for high-performing audience', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      // 1% 應該是首選（最精準）
      expect(screen.getByTestId('primary-percentage')).toHaveTextContent('1%');
    });

    it('should show multiple percentage options', () => {
      render(<ExpansionSuggestion audience={regularSmallAudience} />);

      const percentageOptions = screen.getAllByTestId(/^percentage-option-/);
      expect(percentageOptions.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow selecting different percentage', async () => {
      render(<ExpansionSuggestion audience={regularSmallAudience} />);

      // 找到第二個百分比選項並點擊
      const percentageOptions = screen.getAllByTestId(/^percentage-option-/);
      if (percentageOptions.length > 1) {
        fireEvent.click(percentageOptions[1]);

        await waitFor(() => {
          // 選擇後應該更新顯示的預估數據
          expect(percentageOptions[1]).toHaveClass(/selected|active/);
        });
      }
    });
  });

  describe('estimated reach display (AC3)', () => {
    it('should display estimated lookalike size', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('estimated-size')).toBeInTheDocument();
      // 1% Lookalike 應該約 20 萬人
      expect(screen.getByTestId('estimated-size')).toHaveTextContent(/\d{1,3}(,\d{3})*/);
    });

    it('should display additional reach', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('additional-reach')).toBeInTheDocument();
      // 新增觸及應該大於 0
      expect(screen.getByTestId('additional-reach')).toHaveTextContent(/\+\d/);
    });

    it('should display growth multiplier', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('growth-multiplier')).toBeInTheDocument();
      // 應該顯示 Nx 格式
      expect(screen.getByTestId('growth-multiplier')).toHaveTextContent(/\d+x/);
    });

    it('should display estimated CPA', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('estimated-cpa')).toBeInTheDocument();
      // 應該顯示 NT$ 格式
      expect(screen.getByTestId('estimated-cpa')).toHaveTextContent(/NT\$/);
    });

    it('should update estimated reach when percentage changes', async () => {
      render(<ExpansionSuggestion audience={regularSmallAudience} />);

      const initialSize = screen.getByTestId('estimated-size').textContent;

      // 選擇更高的百分比
      const percentageOptions = screen.getAllByTestId(/^percentage-option-/);
      if (percentageOptions.length > 1) {
        fireEvent.click(percentageOptions[percentageOptions.length - 1]);

        await waitFor(() => {
          const newSize = screen.getByTestId('estimated-size').textContent;
          expect(newSize).not.toBe(initialSize);
        });
      }
    });
  });

  describe('ROI analysis', () => {
    it('should show ROI analysis for high priority suggestions', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('roi-analysis')).toBeInTheDocument();
    });

    it('should display potential conversions', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('potential-conversions')).toBeInTheDocument();
    });

    it('should display potential revenue', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('potential-revenue')).toBeInTheDocument();
    });

    it('should not show ROI for low priority suggestions', () => {
      // 低效能小受眾
      const lowPerformingSmall: Audience = {
        ...regularSmallAudience,
        metrics: { ...regularSmallAudience.metrics, roas: 1.5 },
      };

      render(<ExpansionSuggestion audience={lowPerformingSmall} />);

      // 低優先級不顯示 ROI 分析（或可選）
      const roiSection = screen.queryByTestId('roi-analysis');
      if (roiSection) {
        expect(roiSection).not.toBeVisible();
      }
    });
  });

  describe('action steps', () => {
    it('should display action steps', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('action-steps')).toBeInTheDocument();
    });

    it('should have at least 4 steps for lookalike creation', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      const steps = screen.getAllByTestId(/^action-step-/);
      expect(steps.length).toBeGreaterThanOrEqual(4);
    });

    it('should include step about selecting source audience', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('action-steps')).toHaveTextContent(/來源受眾|選擇/);
    });

    it('should include step about setting similarity percentage', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('action-steps')).toHaveTextContent(/相似度|%/);
    });
  });

  describe('create lookalike callback', () => {
    it('should render create button', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByRole('button', { name: /建立|擴展/ })).toBeInTheDocument();
    });

    it('should call onCreate when button clicked', async () => {
      const handleCreate = vi.fn();
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          onCreate={handleCreate}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /建立|擴展/ }));
      expect(handleCreate).toHaveBeenCalledTimes(1);
    });

    it('should pass selected percentage to onCreate', async () => {
      const handleCreate = vi.fn();
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          onCreate={handleCreate}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /建立|擴展/ }));

      expect(handleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAudienceId: highPerformingSmall.id,
          similarityPercentage: expect.any(Number),
        })
      );
    });

    it('should show loading state during creation', async () => {
      const handleCreate = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          onCreate={handleCreate}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /建立|擴展/ }));

      await waitFor(() => {
        expect(screen.getByTestId('create-loading')).toBeInTheDocument();
      });
    });

    it('should disable button when disabled prop is true', () => {
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          disabled
        />
      );

      expect(screen.getByRole('button', { name: /建立|擴展/ })).toBeDisabled();
    });
  });

  describe('dismiss functionality', () => {
    it('should render dismiss button when onDismiss is provided', () => {
      const handleDismiss = vi.fn();
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          onDismiss={handleDismiss}
        />
      );

      // 應該有「稍後處理」按鈕（可能還有 X 按鈕）
      expect(screen.getByRole('button', { name: '稍後處理' })).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button clicked', () => {
      const handleDismiss = vi.fn();
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          onDismiss={handleDismiss}
        />
      );

      // 使用精確的 aria-label 來選擇「稍後處理」按鈕
      fireEvent.click(screen.getByRole('button', { name: '稍後處理' }));
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('collapsible details', () => {
    it('should have expandable action steps', () => {
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          defaultExpanded={false}
        />
      );

      const expandButton = screen.getByRole('button', { name: /詳細|展開|查看步驟/ });
      expect(expandButton).toBeInTheDocument();
    });

    it('should toggle action steps visibility on click', async () => {
      render(
        <ExpansionSuggestion
          audience={highPerformingSmall}
          defaultExpanded={false}
        />
      );

      // 預設收合
      expect(screen.queryByTestId('action-steps')).not.toBeVisible();

      // 點擊展開
      fireEvent.click(screen.getByRole('button', { name: /詳細|展開|查看步驟/ }));

      await waitFor(() => {
        expect(screen.getByTestId('action-steps')).toBeVisible();
      });
    });
  });

  describe('reason display', () => {
    it('should display reason in Traditional Chinese', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      const reason = screen.getByTestId('expansion-reason');
      expect(reason).toBeInTheDocument();
      // 檢查包含中文字符
      expect(reason.textContent).toMatch(/[\u4e00-\u9fff]/);
    });

    it('should mention audience size in reason', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('expansion-reason')).toHaveTextContent(/規模|小/);
    });

    it('should mention ROAS for high-performing audiences', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('expansion-reason')).toHaveTextContent(/ROAS|效能/);
    });
  });

  describe('accessibility', () => {
    it('should have accessible role', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should have aria-label for buttons', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      const createButton = screen.getByRole('button', { name: /建立|擴展/ });
      expect(createButton).toHaveAttribute('aria-label');
    });

    it('should have descriptive text for percentage options', () => {
      render(<ExpansionSuggestion audience={regularSmallAudience} />);

      const percentageOptions = screen.getAllByTestId(/^percentage-option-/);
      percentageOptions.forEach((option) => {
        expect(option).toHaveTextContent(/%/);
      });
    });
  });

  describe('priority styling', () => {
    it('should use green color for high priority (good expansion opportunity)', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('priority-badge')).toHaveClass(/green|emerald/);
    });

    it('should use yellow color for medium priority', () => {
      render(<ExpansionSuggestion audience={regularSmallAudience} />);

      expect(screen.getByTestId('priority-badge')).toHaveClass(/yellow|amber/);
    });

    it('should use gray color for low priority', () => {
      // 低效能小受眾
      const lowPerformingSmall: Audience = {
        ...regularSmallAudience,
        metrics: { ...regularSmallAudience.metrics, roas: 1.5 },
        health_score: 60,
      };

      render(<ExpansionSuggestion audience={lowPerformingSmall} />);

      expect(screen.getByTestId('priority-badge')).toHaveClass(/gray|neutral/);
    });
  });

  describe('comparison display', () => {
    it('should show before/after comparison', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      expect(screen.getByTestId('current-size')).toBeInTheDocument();
      expect(screen.getByTestId('estimated-size')).toBeInTheDocument();
    });

    it('should show arrow or comparison indicator between sizes', () => {
      render(<ExpansionSuggestion audience={highPerformingSmall} />);

      // 應該有視覺指示從小到大的變化
      expect(screen.getByTestId('size-comparison')).toBeInTheDocument();
    });
  });
});
