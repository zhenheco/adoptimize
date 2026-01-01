'use client';

import { HelpCircle } from 'lucide-react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { cn } from '@/lib/utils';

/**
 * RestartTourButton 元件屬性
 */
export interface RestartTourButtonProps {
  /** 額外的 CSS 類別 */
  className?: string;
  /** 是否顯示圖示 */
  showIcon?: boolean;
  /** 自訂按鈕文字 */
  label?: string;
}

/**
 * 重新開始導覽按鈕
 *
 * 用於讓用戶重新觀看產品導覽
 *
 * @example
 * // 在側邊欄底部使用
 * <RestartTourButton />
 *
 * @example
 * // 自訂樣式
 * <RestartTourButton className="text-blue-600" label="觀看教學" />
 */
export function RestartTourButton({
  className,
  showIcon = true,
  label = '重新觀看導覽',
}: RestartTourButtonProps) {
  const { resetTour } = useOnboarding();

  return (
    <button
      onClick={resetTour}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
        'text-gray-600 hover:bg-gray-100',
        'dark:text-gray-300 dark:hover:bg-gray-700',
        'transition-colors w-full',
        className
      )}
    >
      {showIcon && <HelpCircle className="w-5 h-5" />}
      {label}
    </button>
  );
}
