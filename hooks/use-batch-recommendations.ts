'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Recommendation } from '@/lib/api/types';

/**
 * useBatchRecommendations hook 回傳型別
 */
export interface UseBatchRecommendationsReturn {
  /** 已選取的 ID 集合 */
  selectedIds: Set<string>;
  /** 已選取數量 */
  selectedCount: number;
  /** 待處理項目數量 */
  pendingCount: number;
  /** 是否全選所有待處理項目 */
  isAllPendingSelected: boolean;
  /** 已選取項目的總預估影響金額 */
  totalEstimatedImpact: number;
  /** 切換單一項目選取狀態（只能選取 pending 狀態） */
  toggleSelection: (id: string) => void;
  /** 檢查項目是否已選取 */
  isSelected: (id: string) => boolean;
  /** 選取所有待處理項目 */
  selectAllPending: () => void;
  /** 清除所有選取 */
  clearSelection: () => void;
  /** 切換全選待處理項目狀態 */
  toggleAllPending: () => void;
  /** 取得已選取的完整項目資料 */
  getSelectedItems: () => Recommendation[];
}

/**
 * 建議批次選取 Hook
 *
 * 提供多選功能的狀態管理，只允許選取 pending 狀態的建議
 *
 * @param items - 建議列表
 * @returns 批次選取相關的狀態和方法
 *
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   selectedCount,
 *   toggleSelection,
 *   toggleAllPending,
 *   getSelectedItems,
 * } = useBatchRecommendations(recommendations);
 *
 * // 切換選取狀態
 * <Checkbox
 *   checked={isSelected(recommendation.id)}
 *   onCheckedChange={() => toggleSelection(recommendation.id)}
 * />
 * ```
 */
export function useBatchRecommendations(
  items: Recommendation[]
): UseBatchRecommendationsReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 建立 id 到 item 的映射，方便查找
  const itemsMap = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]));
  }, [items]);

  // 取得所有 pending 狀態的項目
  const pendingItems = useMemo(() => {
    return items.filter((item) => item.status === 'pending');
  }, [items]);

  const pendingCount = pendingItems.length;

  // 當 items 變更時，移除不存在或非 pending 的選取項目
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set<string>();
      prev.forEach((id) => {
        const item = itemsMap.get(id);
        if (item && item.status === 'pending') {
          validIds.add(id);
        }
      });
      // 只有當 Set 內容有變化時才更新
      if (validIds.size !== prev.size) {
        return validIds;
      }
      return prev;
    });
  }, [itemsMap]);

  /**
   * 切換單一項目的選取狀態（只能選取 pending 狀態）
   */
  const toggleSelection = useCallback(
    (id: string) => {
      const item = itemsMap.get(id);
      // 只允許選取 pending 狀態的項目
      if (!item || item.status !== 'pending') {
        return;
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [itemsMap]
  );

  /**
   * 檢查項目是否已選取
   */
  const isSelected = useCallback(
    (id: string): boolean => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  /**
   * 選取所有待處理項目
   */
  const selectAllPending = useCallback(() => {
    setSelectedIds(new Set(pendingItems.map((item) => item.id)));
  }, [pendingItems]);

  /**
   * 清除所有選取
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * 切換全選待處理項目狀態
   */
  const toggleAllPending = useCallback(() => {
    if (selectedIds.size === pendingItems.length && pendingItems.length > 0) {
      clearSelection();
    } else {
      selectAllPending();
    }
  }, [selectedIds.size, pendingItems.length, selectAllPending, clearSelection]);

  /**
   * 取得已選取的完整項目資料
   */
  const getSelectedItems = useCallback((): Recommendation[] => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  // 計算衍生狀態
  const selectedCount = selectedIds.size;
  const isAllPendingSelected =
    pendingItems.length > 0 && selectedIds.size === pendingItems.length;

  // 計算總預估影響金額
  const totalEstimatedImpact = useMemo(() => {
    let total = 0;
    selectedIds.forEach((id) => {
      const item = itemsMap.get(id);
      if (item) {
        total += item.estimated_impact;
      }
    });
    return total;
  }, [selectedIds, itemsMap]);

  return {
    selectedIds,
    selectedCount,
    pendingCount,
    isAllPendingSelected,
    totalEstimatedImpact,
    toggleSelection,
    isSelected,
    selectAllPending,
    clearSelection,
    toggleAllPending,
    getSelectedItems,
  };
}
