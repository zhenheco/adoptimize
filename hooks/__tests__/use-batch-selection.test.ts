/**
 * @vitest-environment jsdom
 *
 * useBatchSelection Hook 測試
 *
 * 測試批次選取功能的核心邏輯
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchSelection } from '../use-batch-selection';
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
  {
    id: 'creative-3',
    name: 'Creative 3',
    type: 'CAROUSEL',
    thumbnail_url: 'https://example.com/img3.jpg',
    metrics: { impressions: 3000, clicks: 150, ctr: 0.05, conversions: 30, spend: 300 },
    fatigue: { score: 80, status: 'fatigued', ctr_change: -25, frequency: 6, days_active: 40 },
    status: 'paused',
  },
];

describe('useBatchSelection', () => {
  describe('初始化', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      expect(result.current.selectedIds).toEqual(new Set());
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });

    it('should handle empty items array', () => {
      const { result } = renderHook(() => useBatchSelection([]));

      expect(result.current.selectedIds).toEqual(new Set());
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('toggleSelection', () => {
    it('should add item to selection when not selected', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.toggleSelection('creative-1');
      });

      expect(result.current.selectedIds.has('creative-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should remove item from selection when already selected', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.toggleSelection('creative-1');
      });

      expect(result.current.selectedIds.has('creative-1')).toBe(true);

      act(() => {
        result.current.toggleSelection('creative-1');
      });

      expect(result.current.selectedIds.has('creative-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should support selecting multiple items', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.toggleSelection('creative-1');
        result.current.toggleSelection('creative-2');
      });

      expect(result.current.selectedIds.has('creative-1')).toBe(true);
      expect(result.current.selectedIds.has('creative-2')).toBe(true);
      expect(result.current.selectedCount).toBe(2);
    });
  });

  describe('isSelected', () => {
    it('should return true for selected items', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.toggleSelection('creative-1');
      });

      expect(result.current.isSelected('creative-1')).toBe(true);
    });

    it('should return false for unselected items', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      expect(result.current.isSelected('creative-1')).toBe(false);
    });
  });

  describe('selectAll', () => {
    it('should select all items', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds.size).toBe(3);
      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isAllSelected).toBe(true);
    });

    it('should handle empty items array', () => {
      const { result } = renderHook(() => useBatchSelection([]));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(3);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('toggleAll', () => {
    it('should select all when none are selected', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.toggleAll();
      });

      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.selectedCount).toBe(3);
    });

    it('should clear all when all are selected', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.isAllSelected).toBe(true);

      act(() => {
        result.current.toggleAll();
      });

      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should select all when some are selected', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.toggleSelection('creative-1');
      });

      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.toggleAll();
      });

      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.selectedCount).toBe(3);
    });
  });

  describe('getSelectedItems', () => {
    it('should return selected items with full data', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.toggleSelection('creative-1');
        result.current.toggleSelection('creative-3');
      });

      const selectedItems = result.current.getSelectedItems();

      expect(selectedItems.length).toBe(2);
      expect(selectedItems[0].id).toBe('creative-1');
      expect(selectedItems[1].id).toBe('creative-3');
    });
  });

  describe('getActiveSelectedItems / getPausedSelectedItems', () => {
    it('should return only active items from selection', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.selectAll();
      });

      const activeItems = result.current.getActiveSelectedItems();

      expect(activeItems.length).toBe(2);
      expect(activeItems.every(item => item.status === 'active')).toBe(true);
    });

    it('should return only paused items from selection', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.selectAll();
      });

      const pausedItems = result.current.getPausedSelectedItems();

      expect(pausedItems.length).toBe(1);
      expect(pausedItems.every(item => item.status === 'paused')).toBe(true);
    });
  });

  describe('activeSelectedCount / pausedSelectedCount', () => {
    it('should correctly count active selected items', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.activeSelectedCount).toBe(2);
    });

    it('should correctly count paused selected items', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.pausedSelectedCount).toBe(1);
    });

    it('should update counts when selection changes', () => {
      const { result } = renderHook(() => useBatchSelection(mockCreatives));

      expect(result.current.activeSelectedCount).toBe(0);
      expect(result.current.pausedSelectedCount).toBe(0);

      act(() => {
        result.current.toggleSelection('creative-1'); // active
      });

      expect(result.current.activeSelectedCount).toBe(1);
      expect(result.current.pausedSelectedCount).toBe(0);

      act(() => {
        result.current.toggleSelection('creative-3'); // paused
      });

      expect(result.current.activeSelectedCount).toBe(1);
      expect(result.current.pausedSelectedCount).toBe(1);
    });
  });

  describe('items 變更時更新 selection', () => {
    it('should remove selected ids that no longer exist in items', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useBatchSelection(items),
        { initialProps: { items: mockCreatives } }
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(3);

      // 移除一個 creative
      const reducedCreatives = mockCreatives.slice(0, 2);
      rerender({ items: reducedCreatives });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.selectedIds.has('creative-3')).toBe(false);
    });
  });
});
