/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchRecommendations } from '../use-batch-recommendations';
import type { Recommendation } from '@/lib/api/types';

// 建立測試用的 recommendations
const createMockRecommendations = (overrides: Partial<Recommendation>[] = []): Recommendation[] => {
  const defaults: Recommendation[] = [
    {
      id: 'rec-1',
      type: 'PAUSE_CREATIVE',
      priority_score: 150,
      title: '暫停疲勞素材',
      description: '素材已疲勞，建議暫停',
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
      status: 'executed', // 已執行
    },
    {
      id: 'rec-4',
      type: 'REFRESH_CREATIVE',
      priority_score: 120,
      title: '更新素材',
      description: '素材需要刷新',
      action_module: 'refresh_creative',
      estimated_impact: 400,
      status: 'pending',
    },
  ];

  return defaults.map((item, index) => ({
    ...item,
    ...overrides[index],
  }));
};

describe('useBatchRecommendations', () => {
  describe('初始狀態', () => {
    it('should initialize with empty selection', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllPendingSelected).toBe(false);
    });

    it('should correctly count pending items', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      // 有 3 個 pending 狀態的項目
      expect(result.current.pendingCount).toBe(3);
    });
  });

  describe('toggleSelection', () => {
    it('should add item to selection', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.toggleSelection('rec-1');
      });

      expect(result.current.selectedIds.has('rec-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should remove item from selection when toggled again', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.toggleSelection('rec-1');
      });

      expect(result.current.selectedIds.has('rec-1')).toBe(true);

      act(() => {
        result.current.toggleSelection('rec-1');
      });

      expect(result.current.selectedIds.has('rec-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should only allow selecting pending items', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      // 嘗試選取已執行的項目 (rec-3 是 executed)
      act(() => {
        result.current.toggleSelection('rec-3');
      });

      // 不應該被選取
      expect(result.current.selectedIds.has('rec-3')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('isSelected', () => {
    it('should return true for selected items', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.toggleSelection('rec-1');
      });

      expect(result.current.isSelected('rec-1')).toBe(true);
      expect(result.current.isSelected('rec-2')).toBe(false);
    });
  });

  describe('selectAllPending', () => {
    it('should select all pending items', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.selectAllPending();
      });

      expect(result.current.selectedCount).toBe(3); // 只有 pending 狀態
      expect(result.current.isSelected('rec-1')).toBe(true);
      expect(result.current.isSelected('rec-2')).toBe(true);
      expect(result.current.isSelected('rec-3')).toBe(false); // executed
      expect(result.current.isSelected('rec-4')).toBe(true);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.selectAllPending();
      });

      expect(result.current.selectedCount).toBe(3);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('toggleAllPending', () => {
    it('should select all pending when none selected', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.toggleAllPending();
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isAllPendingSelected).toBe(true);
    });

    it('should clear selection when all pending selected', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.selectAllPending();
      });

      expect(result.current.isAllPendingSelected).toBe(true);

      act(() => {
        result.current.toggleAllPending();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllPendingSelected).toBe(false);
    });
  });

  describe('getSelectedItems', () => {
    it('should return selected items', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.toggleSelection('rec-1');
        result.current.toggleSelection('rec-2');
      });

      const selected = result.current.getSelectedItems();
      expect(selected).toHaveLength(2);
      expect(selected.map((r) => r.id)).toContain('rec-1');
      expect(selected.map((r) => r.id)).toContain('rec-2');
    });
  });

  describe('totalEstimatedImpact', () => {
    it('should calculate total impact of selected items', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      act(() => {
        result.current.toggleSelection('rec-1'); // 500
        result.current.toggleSelection('rec-2'); // 300
      });

      expect(result.current.totalEstimatedImpact).toBe(800);
    });

    it('should return 0 when no items selected', () => {
      const items = createMockRecommendations();
      const { result } = renderHook(() => useBatchRecommendations(items));

      expect(result.current.totalEstimatedImpact).toBe(0);
    });
  });

  describe('清除過期選取', () => {
    it('should remove invalid selections when items change', () => {
      const items = createMockRecommendations();
      const { result, rerender } = renderHook(
        ({ recommendations }) => useBatchRecommendations(recommendations),
        { initialProps: { recommendations: items } }
      );

      act(() => {
        result.current.toggleSelection('rec-1');
        result.current.toggleSelection('rec-2');
      });

      expect(result.current.selectedCount).toBe(2);

      // 模擬 items 變更（移除 rec-1）
      const newItems = items.filter((item) => item.id !== 'rec-1');
      rerender({ recommendations: newItems });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('rec-1')).toBe(false);
      expect(result.current.isSelected('rec-2')).toBe(true);
    });
  });
});
