'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Creative } from '@/lib/api/types';

/**
 * useBatchSelection hook 回傳型別
 */
export interface UseBatchSelectionReturn {
  /** 已選取的 ID 集合 */
  selectedIds: Set<string>;
  /** 已選取數量 */
  selectedCount: number;
  /** 是否全選 */
  isAllSelected: boolean;
  /** 活躍狀態的已選取數量 */
  activeSelectedCount: number;
  /** 暫停狀態的已選取數量 */
  pausedSelectedCount: number;
  /** 切換單一項目選取狀態 */
  toggleSelection: (id: string) => void;
  /** 檢查項目是否已選取 */
  isSelected: (id: string) => boolean;
  /** 選取所有項目 */
  selectAll: () => void;
  /** 清除所有選取 */
  clearSelection: () => void;
  /** 切換全選狀態 */
  toggleAll: () => void;
  /** 取得已選取的完整項目資料 */
  getSelectedItems: () => Creative[];
  /** 取得已選取且為 active 狀態的項目 */
  getActiveSelectedItems: () => Creative[];
  /** 取得已選取且為 paused 狀態的項目 */
  getPausedSelectedItems: () => Creative[];
}

/**
 * 批次選取 Hook
 *
 * 提供多選功能的狀態管理，支援全選、取消選取、
 * 以及依據 active/paused 狀態篩選選取項目
 *
 * @param items - 可選取的素材列表
 * @returns 批次選取相關的狀態和方法
 *
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   selectedCount,
 *   toggleSelection,
 *   toggleAll,
 *   getActiveSelectedItems,
 * } = useBatchSelection(creatives);
 *
 * // 切換選取狀態
 * <Checkbox
 *   checked={isSelected(creative.id)}
 *   onCheckedChange={() => toggleSelection(creative.id)}
 * />
 * ```
 */
export function useBatchSelection(items: Creative[]): UseBatchSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 建立 id 到 item 的映射，方便查找
  const itemsMap = useMemo(() => {
    return new Map(items.map(item => [item.id, item]));
  }, [items]);

  // 當 items 變更時，移除不存在的選取項目
  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set<string>();
      prev.forEach(id => {
        if (itemsMap.has(id)) {
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
   * 切換單一項目的選取狀態
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * 檢查項目是否已選取
   */
  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.has(id);
  }, [selectedIds]);

  /**
   * 選取所有項目
   */
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items]);

  /**
   * 清除所有選取
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * 切換全選狀態
   */
  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [selectedIds.size, items.length, selectAll, clearSelection]);

  /**
   * 取得已選取的完整項目資料
   */
  const getSelectedItems = useCallback((): Creative[] => {
    return items.filter(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  /**
   * 取得已選取且為 active 狀態的項目
   */
  const getActiveSelectedItems = useCallback((): Creative[] => {
    return items.filter(item => selectedIds.has(item.id) && item.status === 'active');
  }, [items, selectedIds]);

  /**
   * 取得已選取且為 paused 狀態的項目
   */
  const getPausedSelectedItems = useCallback((): Creative[] => {
    return items.filter(item => selectedIds.has(item.id) && item.status === 'paused');
  }, [items, selectedIds]);

  // 計算衍生狀態
  const selectedCount = selectedIds.size;
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  // 計算 active/paused 數量
  const { activeSelectedCount, pausedSelectedCount } = useMemo(() => {
    let active = 0;
    let paused = 0;
    selectedIds.forEach(id => {
      const item = itemsMap.get(id);
      if (item) {
        if (item.status === 'active') {
          active++;
        } else if (item.status === 'paused') {
          paused++;
        }
      }
    });
    return { activeSelectedCount: active, pausedSelectedCount: paused };
  }, [selectedIds, itemsMap]);

  return {
    selectedIds,
    selectedCount,
    isAllSelected,
    activeSelectedCount,
    pausedSelectedCount,
    toggleSelection,
    isSelected,
    selectAll,
    clearSelection,
    toggleAll,
    getSelectedItems,
    getActiveSelectedItems,
    getPausedSelectedItems,
  };
}
