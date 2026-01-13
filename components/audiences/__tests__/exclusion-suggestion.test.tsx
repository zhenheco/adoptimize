/**
 * ExclusionSuggestion 元件測試
 *
 * A-005: Exclusion Suggestions
 * - 根據重疊分析建議排除
 * - 顯示預估影響
 * - 一鍵執行排除
 *
 * TDD 🔴 Red Phase: 先寫測試
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExclusionSuggestion } from '../exclusion-suggestion';
import type { AudienceOverlapPair } from '@/lib/utils/audience-overlap';
import '@testing-library/jest-dom';

describe('ExclusionSuggestion', () => {
  // 高重疊配對資料
  const highOverlapPair: AudienceOverlapPair = {
    audience1: { id: 'aud-1', name: '高價值購買者', size: 50000 },
    audience2: { id: 'aud-2', name: '網站訪客', size: 30000 },
    overlapCount: 12000,
    overlapPercentage: 40,
    status: 'high',
  };

  // 低重疊配對資料
  const lowOverlapPair: AudienceOverlapPair = {
    audience1: { id: 'aud-3', name: '新用戶', size: 80000 },
    audience2: { id: 'aud-4', name: '購物車放棄者', size: 20000 },
    overlapCount: 2000,
    overlapPercentage: 10,
    status: 'low',
  };

  // 非常高重疊配對資料（建議合併）
  const veryHighOverlapPair: AudienceOverlapPair = {
    audience1: { id: 'aud-5', name: '忠實客戶', size: 25000 },
    audience2: { id: 'aud-6', name: 'VIP會員', size: 20000 },
    overlapCount: 16000,
    overlapPercentage: 80,
    status: 'high',
  };

  const mockSpendData = {
    audience1Spend: 5000,
    audience2Spend: 3000,
    audience1CPA: 150,
    audience2CPA: 180,
  };

  describe('rendering', () => {
    it('should render suggestion card with title', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('exclusion-suggestion')).toBeInTheDocument();
      expect(screen.getByText(/排除建議/)).toBeInTheDocument();
    });

    it('should display both audience names', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      // 受眾名稱會出現多次（受眾資訊卡和排除建議中）
      // 檢查至少各出現一次
      const audience1Elements = screen.getAllByText(/高價值購買者/);
      const audience2Elements = screen.getAllByText(/網站訪客/);
      expect(audience1Elements.length).toBeGreaterThanOrEqual(1);
      expect(audience2Elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should show overlap percentage', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      // 檢查在重疊減少區塊中顯示 40%
      expect(screen.getByTestId('overlap-reduction')).toHaveTextContent('40%');
    });

    it('should show priority badge', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      // 40% overlap = high priority
      expect(screen.getByTestId('priority-badge')).toHaveTextContent(/高/);
    });

    it('should not render for low overlap', () => {
      render(
        <ExclusionSuggestion
          pair={lowOverlapPair}
          spendData={mockSpendData}
        />
      );

      // 低重疊時不顯示排除建議
      expect(screen.queryByTestId('exclusion-suggestion')).not.toBeInTheDocument();
    });
  });

  describe('impact estimation display', () => {
    it('should display estimated savings', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      // 應該顯示預估節省金額（NT$ 格式）
      expect(screen.getByTestId('estimated-savings')).toBeInTheDocument();
      expect(screen.getByTestId('estimated-savings')).toHaveTextContent(/NT\$/);
    });

    it('should display CPA improvement estimate', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('cpa-improvement')).toBeInTheDocument();
    });

    it('should display overlap reduction', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('overlap-reduction')).toHaveTextContent(/40%/);
    });

    it('should show N/A when spend data is unavailable', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={{}}
        />
      );

      expect(screen.getByTestId('estimated-savings')).toHaveTextContent('N/A');
    });
  });

  describe('exclusion direction display', () => {
    it('should indicate which audience to exclude from which', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      // 應該顯示「在 X 中排除 Y」的說明
      const directionText = screen.getByTestId('exclusion-direction');
      expect(directionText).toBeInTheDocument();
      // 較小的受眾（網站訪客）應該被排除
      expect(directionText).toHaveTextContent(/排除/);
    });

    it('should show reason for exclusion direction', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      // 應該有解釋為什麼這樣排除
      expect(screen.getByTestId('direction-reason')).toBeInTheDocument();
    });
  });

  describe('action steps', () => {
    it('should display action steps list', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('action-steps')).toBeInTheDocument();
    });

    it('should have at least 3 steps', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      const steps = screen.getAllByTestId(/^action-step-/);
      expect(steps.length).toBeGreaterThanOrEqual(3);
    });

    it('should include step about editing audience', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('action-steps')).toHaveTextContent(/編輯/);
    });
  });

  describe('one-click exclusion', () => {
    it('should render execute button', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByRole('button', { name: /執行排除/ })).toBeInTheDocument();
    });

    it('should call onExecute when button clicked', async () => {
      const handleExecute = vi.fn();
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
          onExecute={handleExecute}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /執行排除/ }));
      expect(handleExecute).toHaveBeenCalledTimes(1);
      expect(handleExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAudienceId: expect.any(String),
          excludeAudienceId: expect.any(String),
        })
      );
    });

    it('should show loading state during execution', async () => {
      const handleExecute = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
          onExecute={handleExecute}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /執行排除/ }));

      await waitFor(() => {
        expect(screen.getByTestId('execute-loading')).toBeInTheDocument();
      });
    });

    it('should disable button when disabled prop is true', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
          disabled
        />
      );

      expect(screen.getByRole('button', { name: /執行排除/ })).toBeDisabled();
    });
  });

  describe('alternative actions', () => {
    it('should suggest merge for very high overlap', () => {
      render(
        <ExclusionSuggestion
          pair={veryHighOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('alternative-action')).toBeInTheDocument();
      expect(screen.getByTestId('alternative-action')).toHaveTextContent(/合併/);
    });

    it('should not show alternative action for moderate overlap', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.queryByTestId('alternative-action')).not.toBeInTheDocument();
    });
  });

  describe('dismiss functionality', () => {
    it('should render dismiss button when onDismiss is provided', () => {
      const handleDismiss = vi.fn();
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
          onDismiss={handleDismiss}
        />
      );

      // 稍後處理按鈕應該存在
      expect(screen.getByRole('button', { name: '稍後處理' })).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button clicked', () => {
      const handleDismiss = vi.fn();
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
          onDismiss={handleDismiss}
        />
      );

      // 點擊「稍後處理」按鈕
      fireEvent.click(screen.getByRole('button', { name: '稍後處理' }));
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('collapsible details', () => {
    it('should have expandable action steps', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      const expandButton = screen.getByRole('button', { name: /詳細步驟|展開|查看/ });
      expect(expandButton).toBeInTheDocument();
    });

    it('should toggle action steps visibility on click', async () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
          defaultExpanded={false}
        />
      );

      // 預設收合
      expect(screen.queryByTestId('action-steps')).not.toBeVisible();

      // 點擊展開
      fireEvent.click(screen.getByRole('button', { name: /詳細步驟|展開|查看/ }));

      await waitFor(() => {
        expect(screen.getByTestId('action-steps')).toBeVisible();
      });
    });
  });

  describe('accessibility', () => {
    it('should have accessible role', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should have aria-label for buttons', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      const executeButton = screen.getByRole('button', { name: /執行排除/ });
      expect(executeButton).toHaveAttribute('aria-label');
    });
  });

  describe('priority styling', () => {
    it('should use yellow color for medium priority', () => {
      const mediumPair: AudienceOverlapPair = {
        ...highOverlapPair,
        overlapPercentage: 35,
        status: 'high',
      };

      render(
        <ExclusionSuggestion
          pair={mediumPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('priority-badge')).toHaveClass(/yellow/);
    });

    it('should use red color for high/critical priority', () => {
      render(
        <ExclusionSuggestion
          pair={highOverlapPair}
          spendData={mockSpendData}
        />
      );

      expect(screen.getByTestId('priority-badge')).toHaveClass(/red/);
    });
  });
});
