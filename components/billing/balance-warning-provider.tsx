'use client';

import { useEffect, useState } from 'react';
import { BalanceWarningBanner } from './balance-warning';

/**
 * 餘額警告 Provider
 *
 * 在 Dashboard Layout 中使用，自動載入用戶餘額並顯示警告
 */
export function BalanceWarningProvider() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/v1/billing/wallet', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, []);

  // 載入中或無餘額資料時不顯示
  if (isLoading || balance === null) {
    return null;
  }

  return (
    <BalanceWarningBanner
      balance={balance}
      threshold={500}
      criticalThreshold={100}
    />
  );
}
