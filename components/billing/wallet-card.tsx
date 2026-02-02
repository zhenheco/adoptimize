'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface WalletCardProps {
  balance: number;
  showDepositButton?: boolean;
  compact?: boolean;
}

/**
 * 錢包卡片元件
 *
 * 顯示錢包餘額，可選擇顯示儲值按鈕
 */
export function WalletCard({ balance, showDepositButton = true, compact = false }: WalletCardProps) {
  // 格式化金額
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 餘額警告閾值
  const isLowBalance = balance < 500;
  const isCriticalBalance = balance < 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Wallet className="w-4 h-4 text-gray-500" />
        <span className={`font-medium ${isCriticalBalance ? 'text-red-600' : isLowBalance ? 'text-yellow-600' : 'text-gray-900 dark:text-white'}`}>
          {formatAmount(balance)}
        </span>
        {showDepositButton && (
          <Link href="/billing">
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Plus className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
          錢包餘額
        </CardTitle>
        <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-3xl font-bold ${
              isCriticalBalance
                ? 'text-red-600 dark:text-red-400'
                : isLowBalance
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-900 dark:text-white'
            }`}>
              {formatAmount(balance)}
            </div>
            {isLowBalance && (
              <p className={`text-sm mt-1 ${isCriticalBalance ? 'text-red-500' : 'text-yellow-500'}`}>
                {isCriticalBalance ? '餘額不足，請立即儲值' : '餘額偏低，建議儲值'}
              </p>
            )}
          </div>
          {showDepositButton && (
            <Link href="/billing">
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                儲值
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 錢包摘要元件（用於側邊欄或 header）
 */
export function WalletSummary({ balance }: { balance: number }) {
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}萬`;
    }
    return `${amount}`;
  };

  const isCriticalBalance = balance < 100;

  return (
    <Link href="/billing" className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity">
      <Wallet className={`w-4 h-4 ${isCriticalBalance ? 'text-red-500' : 'text-gray-500'}`} />
      <span className={`font-medium ${isCriticalBalance ? 'text-red-600' : ''}`}>
        NT${formatAmount(balance)}
      </span>
      <ArrowUpRight className="w-3 h-3 text-gray-400" />
    </Link>
  );
}
