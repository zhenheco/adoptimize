'use client';

import { HelpCircle } from 'lucide-react';
import { getTerm } from '@/lib/glossary';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

/**
 * TermTooltip 元件屬性
 */
export interface TermTooltipProps {
  /** 術語 ID，對應 GLOSSARY_TERMS 的 key */
  termId: string;
  /** 是否顯示問號圖示（預設 true） */
  showIcon?: boolean;
  /** 自訂觸發元素（不使用時顯示問號圖示） */
  children?: React.ReactNode;
  /** 額外的 CSS 類別 */
  className?: string;
}

/**
 * 術語解釋 Tooltip 元件
 * 用於在專業術語旁顯示懸停解釋
 *
 * @example
 * // 基本用法 - 顯示問號圖示
 * <TermTooltip termId="cpa" />
 *
 * @example
 * // 自訂觸發元素
 * <TermTooltip termId="roas">
 *   <span className="underline cursor-help">ROAS</span>
 * </TermTooltip>
 */
export function TermTooltip({
  termId,
  showIcon = true,
  children,
  className,
}: TermTooltipProps) {
  const term = getTerm(termId);

  // 如果找不到術語定義，不渲染任何內容
  if (!term) {
    return null;
  }

  // 決定觸發元素
  const trigger = children ?? (
    showIcon && (
      <HelpCircle className="inline-block w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help" />
    )
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{trigger}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {/* 術語標題 */}
          <p className="font-semibold mb-1">{term.term}</p>
          {/* 術語定義 */}
          <p className="text-gray-200 dark:text-gray-700">{term.definition}</p>
          {/* 範例說明（如有） */}
          {term.example && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-700 dark:border-gray-300 pt-2">
              {term.example}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
