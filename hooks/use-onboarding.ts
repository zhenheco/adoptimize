'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isOnboardingCompleted,
  setOnboardingCompleted,
  resetOnboarding,
} from '@/lib/onboarding';
import type { UseOnboardingReturn } from '@/lib/onboarding';

/**
 * Onboarding 狀態管理 Hook
 *
 * 提供導覽狀態控制和 localStorage 持久化
 *
 * @example
 * const { run, stepIndex, startTour, skipTour, resetTour } = useOnboarding();
 *
 * // 在 Joyride 中使用
 * <Joyride run={run} stepIndex={stepIndex} ... />
 *
 * // 重新開始導覽
 * <button onClick={resetTour}>重新觀看導覽</button>
 */
export function useOnboarding(): UseOnboardingReturn {
  // 導覽是否正在執行
  const [run, setRun] = useState(false);
  // 當前步驟索引
  const [stepIndex, setStepIndex] = useState(0);
  // 是否已初始化（避免 SSR 問題）
  const [initialized, setInitialized] = useState(false);

  // 首次載入時檢查是否需要顯示導覽
  useEffect(() => {
    // 只在客戶端執行
    if (typeof window === 'undefined') {
      return;
    }

    // 延遲一小段時間再啟動導覽，確保頁面已完全渲染
    const timer = setTimeout(() => {
      const completed = isOnboardingCompleted();
      if (!completed) {
        setRun(true);
      }
      setInitialized(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  /**
   * 開始導覽
   */
  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  /**
   * 跳過/完成導覽
   */
  const skipTour = useCallback(() => {
    setRun(false);
    setOnboardingCompleted(true);
  }, []);

  /**
   * 重置並重新開始導覽
   */
  const resetTour = useCallback(() => {
    resetOnboarding();
    setStepIndex(0);
    // 短暫延遲後開始，確保 DOM 準備好
    setTimeout(() => {
      setRun(true);
    }, 100);
  }, []);

  return {
    run: initialized ? run : false, // 未初始化時不執行
    stepIndex,
    startTour,
    skipTour,
    resetTour,
    setStepIndex,
  };
}
