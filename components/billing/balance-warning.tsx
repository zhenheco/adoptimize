'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

interface BalanceWarningProps {
  balance: number;
  threshold?: number;
  criticalThreshold?: number;
  dismissible?: boolean;
}

/**
 * 餘額警告元件
 *
 * 當餘額低於閾值時顯示警告
 */
export function BalanceWarning({
  balance,
  threshold = 500,
  criticalThreshold = 100,
  dismissible = true,
}: BalanceWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // 不顯示警告的情況
  if (isDismissed || balance >= threshold) {
    return null;
  }

  const isCritical = balance < criticalThreshold;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg ${
        isCritical
          ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle
          className={`w-5 h-5 flex-shrink-0 ${
            isCritical
              ? 'text-red-500 dark:text-red-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`}
        />
        <div>
          <p
            className={`text-sm font-medium ${
              isCritical
                ? 'text-red-800 dark:text-red-200'
                : 'text-yellow-800 dark:text-yellow-200'
            }`}
          >
            {isCritical ? '餘額不足！' : '餘額偏低'}
          </p>
          <p
            className={`text-xs ${
              isCritical
                ? 'text-red-600 dark:text-red-300'
                : 'text-yellow-600 dark:text-yellow-300'
            }`}
          >
            目前餘額 {formatAmount(balance)}
            {isCritical
              ? '，部分功能可能無法使用'
              : '，建議儲值以確保服務不中斷'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/billing">
          <Button
            size="sm"
            variant={isCritical ? 'default' : 'outline'}
            className={
              isCritical
                ? 'bg-red-600 hover:bg-red-700'
                : 'border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-900'
            }
          >
            立即儲值
          </Button>
        </Link>
        {dismissible && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDismissed(true)}
            className={
              isCritical
                ? 'text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900'
                : 'text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900'
            }
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 餘額警告 Banner（固定在頁面頂部）
 */
export function BalanceWarningBanner({
  balance,
  threshold = 500,
  criticalThreshold = 100,
}: Omit<BalanceWarningProps, 'dismissible'>) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || balance >= threshold) {
    return null;
  }

  const isCritical = balance < criticalThreshold;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-TW').format(amount);
  };

  return (
    <div
      className={`w-full px-4 py-2 ${
        isCritical
          ? 'bg-red-500 dark:bg-red-600'
          : 'bg-yellow-500 dark:bg-yellow-600'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isCritical
              ? `餘額不足！目前僅剩 NT$${formatAmount(balance)}`
              : `餘額偏低：NT$${formatAmount(balance)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/billing">
            <Button size="sm" variant="secondary" className="h-7 text-xs">
              儲值
            </Button>
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
