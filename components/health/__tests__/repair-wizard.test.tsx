/**
 * RepairWizard Component Tests
 *
 * Tests for the step-by-step repair wizard component
 * H-006: Step-by-step repair guide
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RepairWizard } from '../repair-wizard';
import type { AuditIssue } from '@/lib/api/types';

// Mock issue for testing
const mockIssue: AuditIssue = {
  id: 'issue-1',
  category: 'CREATIVE',
  severity: 'HIGH',
  issue_code: 'CREATIVE_FATIGUE',
  title: '素材疲勞',
  description: '部分素材 CTR 下降超過 15%',
  impact_description: '會導致廣告效果下降',
  solution: '建議更換新素材',
  affected_entities: ['creative-1', 'creative-2'],
  status: 'open',
};

describe('RepairWizard', () => {
  describe('rendering', () => {
    it('should render wizard title', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.getByText(/修復指南/)).toBeInTheDocument();
    });

    it('should render issue title', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      // The title appears in the wizard header as "修復指南：{issue.title}"
      expect(screen.getByText(`修復指南：${mockIssue.title}`)).toBeInTheDocument();
    });

    it('should render all repair steps', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      // CREATIVE_FATIGUE has 4 steps
      expect(screen.getByText('識別疲勞素材')).toBeInTheDocument();
      expect(screen.getByText('暫停疲勞素材')).toBeInTheDocument();
    });

    it('should render step numbers', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render estimated time', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      // Multiple elements contain "分鐘", at least one should exist
      const timeElements = screen.getAllByText(/分鐘/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should render close button', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      // There are two close buttons (X button and text button), get all of them
      const closeButtons = screen.getAllByRole('button', { name: /關閉/ });
      expect(closeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('step completion', () => {
    it('should mark step as complete when checkbox clicked', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });

    it('should update progress when step completed', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      // With 4 steps, completing 1 should be 25%
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });

    it('should show complete button when all steps done', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      const checkboxes = screen.getAllByRole('checkbox');

      // Complete all steps
      checkboxes.forEach((checkbox) => {
        fireEvent.click(checkbox);
      });

      expect(screen.getByRole('button', { name: /完成並重新健檢/ })).toBeInTheDocument();
    });

    it('should not show complete button when steps incomplete', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.queryByRole('button', { name: /完成並重新健檢/ })).not.toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onComplete when complete button clicked', () => {
      const onComplete = vi.fn();
      render(<RepairWizard issue={mockIssue} onComplete={onComplete} onClose={() => {}} />);

      // Complete all steps
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        fireEvent.click(checkbox);
      });

      // Click complete button
      fireEvent.click(screen.getByRole('button', { name: /完成並重新健檢/ }));
      expect(onComplete).toHaveBeenCalledWith(mockIssue.id);
    });

    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={onClose} />);

      // Get all close buttons and click the first one
      const closeButtons = screen.getAllByRole('button', { name: /關閉/ });
      fireEvent.click(closeButtons[0]);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('step unchecking', () => {
    it('should uncheck step when clicked again', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      const checkboxes = screen.getAllByRole('checkbox');

      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();

      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
    });

    it('should decrease progress when step unchecked', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      const progressBar = screen.getByRole('progressbar');
      const checkboxes = screen.getAllByRole('checkbox');

      fireEvent.click(checkboxes[0]);
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');

      fireEvent.click(checkboxes[0]);
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  describe('different issue types', () => {
    it('should render steps for AUDIENCE issue', () => {
      const audienceIssue: AuditIssue = {
        ...mockIssue,
        category: 'AUDIENCE',
        issue_code: 'AUDIENCE_OVERLAP',
        title: '受眾重疊',
      };

      render(<RepairWizard issue={audienceIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.getByText('分析受眾重疊')).toBeInTheDocument();
    });

    it('should render steps for BUDGET issue', () => {
      const budgetIssue: AuditIssue = {
        ...mockIssue,
        category: 'BUDGET',
        issue_code: 'BUDGET_INEFFICIENT',
        title: '預算分配低效',
      };

      render(<RepairWizard issue={budgetIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.getByText('識別低效支出')).toBeInTheDocument();
    });

    it('should render steps for TRACKING issue', () => {
      const trackingIssue: AuditIssue = {
        ...mockIssue,
        category: 'TRACKING',
        issue_code: 'TRACKING_MISSING',
        title: '缺少追蹤',
      };

      render(<RepairWizard issue={trackingIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.getByText('安裝追蹤代碼')).toBeInTheDocument();
    });

    it('should render generic steps for unknown issue', () => {
      const unknownIssue: AuditIssue = {
        ...mockIssue,
        issue_code: 'UNKNOWN_ISSUE_CODE',
        title: '未知問題',
      };

      render(<RepairWizard issue={unknownIssue} onComplete={() => {}} onClose={() => {}} />);
      expect(screen.getByText('分析問題原因')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible progress bar', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have accessible checkboxes with labels', () => {
      render(<RepairWizard issue={mockIssue} onComplete={() => {}} onClose={() => {}} />);
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute('aria-label');
      });
    });
  });
});
