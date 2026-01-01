'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

/**
 * Tooltip Provider
 * 提供全局 Tooltip 設定，建議放在 app 最外層
 */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tooltip Root
 * Tooltip 的根容器
 */
const Tooltip = TooltipPrimitive.Root;

/**
 * Tooltip Trigger
 * 觸發 Tooltip 顯示的元素
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Tooltip Content
 * Tooltip 內容區塊，包含樣式和動畫
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // 基礎樣式
        'z-50 overflow-hidden rounded-md px-3 py-2 text-sm shadow-md',
        // 顏色 - 深色背景、淺色文字
        'bg-gray-900 text-gray-50',
        // 暗色模式
        'dark:bg-gray-50 dark:text-gray-900',
        // 動畫
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        // 根據位置調整動畫方向
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
