'use client';

import { AlertTriangle, Calculator } from 'lucide-react';

interface FeeEstimateProps {
  /** 操作類型（保留供未來使用） */
  actionType?: string;
  /** 廣告花費金額 */
  adSpend: number;
  /** 抽成比例（小數，如 0.1 表示 10%） */
  commissionRate: number;
  /** 是否為計費操作（預設 true） */
  isBillable?: boolean;
  /** 目前餘額（用於顯示餘額不足警告） */
  currentBalance?: number;
  /** 顯示變體 */
  variant?: 'default' | 'compact';
  /** 測試用 ID */
  'data-testid'?: string;
}

/**
 * 費用預估元件
 *
 * 顯示操作的預估費用，包含抽成比例和金額
 */
export function FeeEstimate({
  actionType,
  adSpend,
  commissionRate,
  isBillable = true,
  currentBalance,
  variant = 'default',
  'data-testid': testId,
}: FeeEstimateProps) {
  // 計算預估費用
  const estimatedFee = isBillable ? Math.round(adSpend * commissionRate) : 0;

  // 檢查餘額是否足夠
  const isInsufficientBalance =
    currentBalance !== undefined && currentBalance < estimatedFee;

  // 格式化金額
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 抽成百分比
  const commissionPercent = Math.round(commissionRate * 100);

  const isCompact = variant === 'compact';

  return (
    <div
      data-testid={testId}
      className={`rounded-lg ${
        isCompact
          ? 'text-sm'
          : 'p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className={`flex items-center gap-2 ${isCompact ? '' : 'mb-3'}`}>
        <Calculator
          className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-500`}
        />
        <span className="font-medium text-gray-900 dark:text-white">
          預估費用
        </span>
      </div>

      <div className={`space-y-2 ${isCompact ? 'mt-2' : ''}`}>
        {/* 廣告花費 */}
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>廣告花費</span>
          <span>{formatAmount(adSpend)}</span>
        </div>

        {/* 抽成比例 */}
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>抽成比例</span>
          <span>{commissionPercent}%</span>
        </div>

        {/* 預估費用 */}
        <div
          className={`flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 ${
            isCompact ? '' : 'font-semibold'
          }`}
        >
          <span className="text-gray-900 dark:text-white">應付金額</span>
          <span
            className={
              isBillable
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-green-600 dark:text-green-400'
            }
          >
            {isBillable ? formatAmount(estimatedFee) : '免費'}
          </span>
        </div>
      </div>

      {/* 餘額不足警告 */}
      {isInsufficientBalance && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/30 rounded text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>餘額不足，目前餘額 {formatAmount(currentBalance!)}</span>
        </div>
      )}
    </div>
  );
}
