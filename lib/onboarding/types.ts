import type { Step } from 'react-joyride';

/**
 * Onboarding 狀態
 */
export interface OnboardingState {
  /** 是否正在執行導覽 */
  run: boolean;
  /** 當前步驟索引 */
  stepIndex: number;
}

/**
 * Onboarding 動作
 */
export interface OnboardingActions {
  /** 開始導覽 */
  startTour: () => void;
  /** 跳過導覽 */
  skipTour: () => void;
  /** 重置並重新開始導覽 */
  resetTour: () => void;
  /** 設置步驟索引 */
  setStepIndex: (index: number) => void;
}

/**
 * Onboarding Hook 返回類型
 */
export type UseOnboardingReturn = OnboardingState & OnboardingActions;

/**
 * 導覽步驟類型（基於 react-joyride 的 Step）
 */
export type OnboardingStep = Step;
