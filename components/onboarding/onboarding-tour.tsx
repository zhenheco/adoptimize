'use client';

import dynamic from 'next/dynamic';
import { useOnboarding } from '@/hooks/use-onboarding';
import { ONBOARDING_STEPS } from '@/lib/onboarding';
import type { CallBackProps } from 'react-joyride';
import { ACTIONS, EVENTS, STATUS } from 'react-joyride';

// 動態載入 Joyride 以避免 SSR 問題
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

/**
 * Onboarding 導覽元件
 *
 * 使用 react-joyride 實現步驟式產品導覽
 * 首次進入儀表板時自動觸發
 *
 * @example
 * // 在 Dashboard Layout 中使用
 * <OnboardingTour />
 */
export function OnboardingTour() {
  const { run, stepIndex, setStepIndex, skipTour } = useOnboarding();

  /**
   * 處理 Joyride 回調事件
   */
  const handleCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data;

    // 步驟完成或找不到目標元素時，移到下一步
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextIndex);
    }

    // 導覽完成或被跳過
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      skipTour();
    }
  };

  return (
    <Joyride
      steps={ONBOARDING_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      locale={{
        back: '上一步',
        close: '關閉',
        last: '完成',
        next: '下一步',
        skip: '跳過導覽',
      }}
      styles={{
        options: {
          primaryColor: '#2563eb', // blue-600
          zIndex: 10000,
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        tooltip: {
          borderRadius: 8,
          padding: 16,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.5,
        },
        buttonNext: {
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          borderRadius: 6,
          padding: '8px 16px',
          marginRight: 8,
        },
        buttonSkip: {
          borderRadius: 6,
          padding: '8px 16px',
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}
