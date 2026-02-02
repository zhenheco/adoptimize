'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { PricingTable } from '@/components/billing';

interface PlanConfig {
  monthly_fee: number;
  commission_rate: number;
  commission_percent: number;
  ai_audience_price: number;
  ai_copywriting_price: number;
  ai_image_price: number;
  monthly_copywriting_quota: number;
  monthly_image_quota: number;
}

interface Subscription {
  id: string;
  plan: string;
  monthly_fee: number;
  commission_rate: number;
  commission_percent: number;
  is_active: boolean;
}

/**
 * 定價方案頁面
 */
export default function PricingPage() {
  const [plans, setPlans] = useState<Record<string, PlanConfig> | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

        const [pricingRes, subRes] = await Promise.all([
          fetch('/api/v1/billing/pricing', { headers }),
          fetch('/api/v1/billing/subscription', { headers }),
        ]);

        if (pricingRes.ok) {
          const pricingData = await pricingRes.json();
          setPlans(pricingData.plans);
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData);
        }
      } catch (err) {
        console.error('Failed to fetch pricing data:', err);
        setError('載入資料失敗');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // 處理方案選擇
  const handleSelectPlan = async (plan: string) => {
    if (!subscription || plan === subscription.plan) return;

    const token = getToken();
    if (!token) {
      setToast({ type: 'error', message: '請先登入' });
      return;
    }

    // 確認升級
    const planNames: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      agency: 'Agency',
    };
    const planOrder = ['free', 'pro', 'agency'];
    const isUpgrade = planOrder.indexOf(plan) > planOrder.indexOf(subscription.plan);
    const action = isUpgrade ? '升級' : '變更';

    if (!confirm(`確定要${action}到 ${planNames[plan]} 方案嗎？`)) {
      return;
    }

    setIsUpgrading(true);
    try {
      const response = await fetch('/api/v1/billing/subscription/upgrade', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscription(data);
        setToast({
          type: 'success',
          message: `已成功${action}到 ${planNames[plan]} 方案`,
        });
      } else {
        setToast({
          type: 'error',
          message: data.error?.message || data.detail || '方案變更失敗',
        });
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setToast({ type: 'error', message: '方案變更失敗，請稍後再試' });
    } finally {
      setIsUpgrading(false);
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
          <Link
            href="/billing"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回帳單
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            選擇方案
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            根據您的需求選擇最適合的方案
          </p>
        </div>
      </div>

      {/* 方案比較說明 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          方案差異說明
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>操作抽成費率</strong>：執行廣告操作時，依預算金額收取的服務費比例</li>
          <li>• <strong>AI 配額</strong>：每月免費使用 AI 功能的次數，超額後按次計費</li>
          <li>• <strong>月費</strong>：方案基本費用，Free 方案完全免費</li>
        </ul>
      </div>

      {/* 定價表 */}
      {plans && (
        <PricingTable
          plans={plans}
          currentPlan={subscription?.plan}
          onSelectPlan={handleSelectPlan}
          isLoading={isUpgrading}
        />
      )}

      {/* FAQ */}
      <div className="mt-12 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          常見問題
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              什麼是操作抽成？
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              當您透過廣告船長執行廣告操作（如建立廣告活動、調整預算等）時，
              系統會根據您的方案費率，按操作金額收取服務費。
              例如：Free 方案執行 NT$10,000 預算的操作，服務費為 NT$1,000 (10%)。
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              AI 配額用完會怎樣？
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              配額用完後，您仍可繼續使用 AI 功能，
              但會從錢包餘額中扣除費用。
              文案生成 NT$5/次，圖片生成 NT$10/次（依方案不同略有差異）。
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              可以隨時升級或降級嗎？
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              可以！您可以隨時變更方案。
              升級後立即生效，享受更低的抽成費率和更多配額。
              降級後也會立即生效，抽成費率和配額會調整為新方案的標準。
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              月費什麼時候扣款？
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              月費會在每月 1 日從錢包餘額中自動扣除。
              如果餘額不足，系統會發送通知提醒您儲值。
              Free 方案沒有月費。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
