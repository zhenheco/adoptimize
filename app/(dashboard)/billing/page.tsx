'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  CreditCard,
  ArrowRight,
  AlertCircle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  WalletCard,
  TransactionList,
  SubscriptionCard,
  AIQuotaCard,
} from '@/components/billing';

interface WalletData {
  balance: number;
  user_id: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

interface Subscription {
  id: string;
  plan: string;
  monthly_fee: number;
  commission_rate: number;
  commission_percent: number;
  is_active: boolean;
  monthly_copywriting_quota: number;
  monthly_copywriting_used: number;
  monthly_image_quota: number;
  monthly_image_used: number;
}

interface AIQuota {
  copywriting: {
    quota: number;
    used: number;
    remaining: number;
  };
  image: {
    quota: number;
    used: number;
    remaining: number;
  };
}

/**
 * 帳單總覽頁面
 */
export default function BillingPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [aiQuota, setAiQuota] = useState<AIQuota | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 儲值相關狀態
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // 預設儲值金額選項
  const depositOptions = [500, 1000, 3000, 5000, 10000];

  // 取得 token
  const getToken = () => localStorage.getItem('access_token');

  // 載入資料
  useEffect(() => {
    async function fetchData() {
      const token = getToken();
      if (!token) {
        setError('請先登入');
        setIsLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        // 並行請求所有資料
        const [walletRes, txRes, subRes, quotaRes] = await Promise.all([
          fetch('/api/v1/billing/wallet', { headers }),
          fetch('/api/v1/billing/wallet/transactions?limit=10', { headers }),
          fetch('/api/v1/billing/subscription', { headers }),
          fetch('/api/v1/billing/ai-quota', { headers }),
        ]);

        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData);
        }

        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData.transactions || []);
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData);
        }

        if (quotaRes.ok) {
          const quotaData = await quotaRes.json();
          setAiQuota(quotaData);
        }
      } catch (err) {
        console.error('Failed to fetch billing data:', err);
        setError('載入資料失敗');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // 處理儲值
  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setToast({ type: 'error', message: '請輸入有效金額' });
      return;
    }

    const token = getToken();
    if (!token) {
      setToast({ type: 'error', message: '請先登入' });
      return;
    }

    setIsDepositing(true);
    try {
      const response = await fetch('/api/v1/billing/wallet/deposit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToast({
          type: 'success',
          message: `成功儲值 NT$${amount.toLocaleString()}`,
        });
        // 更新錢包餘額
        setWallet((prev) =>
          prev ? { ...prev, balance: data.new_balance } : null
        );
        // 重新載入交易紀錄
        const txRes = await fetch('/api/v1/billing/wallet/transactions?limit=10', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData.transactions || []);
        }
        setDepositAmount('');
      } else {
        setToast({
          type: 'error',
          message: data.error || '儲值失敗',
        });
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setToast({ type: 'error', message: '儲值失敗，請稍後再試' });
    } finally {
      setIsDepositing(false);
    }
  };

  // 自動關閉 toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-500">{error}</p>
        <Link href="/auth/login">
          <Button>前往登入</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast 通知 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-1 hover:bg-black/10 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            帳單與錢包
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            管理您的錢包餘額、訂閱方案與交易紀錄
          </p>
        </div>
        <Link href="/pricing">
          <Button variant="outline">
            查看方案
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* 主要內容 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左側：錢包和儲值 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 錢包卡片 */}
          {wallet && (
            <WalletCard balance={wallet.balance} showDepositButton={false} />
          )}

          {/* 儲值區塊 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">錢包儲值</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    選擇金額或自訂儲值金額
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 快速選擇金額 */}
                <div className="flex flex-wrap gap-2">
                  {depositOptions.map((amount) => (
                    <Button
                      key={amount}
                      variant={depositAmount === String(amount) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDepositAmount(String(amount))}
                    >
                      NT${amount.toLocaleString()}
                    </Button>
                  ))}
                </div>

                {/* 自訂金額 */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      NT$
                    </span>
                    <Input
                      type="number"
                      placeholder="輸入金額"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="pl-12"
                      min={100}
                    />
                  </div>
                  <Button
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount}
                    className="min-w-[100px]"
                  >
                    {isDepositing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        儲值
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  * 目前為測試模式，儲值將直接入帳
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 交易紀錄 */}
          <TransactionList transactions={transactions} />
        </div>

        {/* 右側：訂閱和配額 */}
        <div className="space-y-6">
          {/* 訂閱卡片 */}
          {subscription && <SubscriptionCard subscription={subscription} />}

          {/* AI 配額卡片 */}
          {aiQuota && (
            <AIQuotaCard copywriting={aiQuota.copywriting} image={aiQuota.image} />
          )}
        </div>
      </div>
    </div>
  );
}
