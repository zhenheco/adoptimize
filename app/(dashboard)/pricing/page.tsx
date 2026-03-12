"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, AlertCircle, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { PricingTable } from "@/components/billing";

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
  const t = useTranslations("pricing");
  const tc = useTranslations("common");
  const tb = useTranslations("billing");
  const [plans, setPlans] = useState<Record<string, PlanConfig> | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // 預設方案資料（API 失敗時使用）
  const defaultPlans: Record<string, PlanConfig> = {
    free: {
      monthly_fee: 0,
      commission_rate: 0.1,
      commission_percent: 10,
      ai_audience_price: 10,
      ai_copywriting_price: 5,
      ai_image_price: 10,
      monthly_copywriting_quota: 20,
      monthly_image_quota: 5,
    },
    pro: {
      monthly_fee: 990,
      commission_rate: 0.05,
      commission_percent: 5,
      ai_audience_price: 8,
      ai_copywriting_price: 3,
      ai_image_price: 8,
      monthly_copywriting_quota: 100,
      monthly_image_quota: 30,
    },
    agency: {
      monthly_fee: 2990,
      commission_rate: 0.02,
      commission_percent: 2,
      ai_audience_price: 5,
      ai_copywriting_price: 2,
      ai_image_price: 5,
      monthly_copywriting_quota: 500,
      monthly_image_quota: 100,
    },
  };

  const defaultSubscription: Subscription = {
    id: "default",
    plan: "free",
    monthly_fee: 0,
    commission_rate: 0.1,
    commission_percent: 10,
    is_active: true,
  };

  // 取得 token
  const getToken = () => localStorage.getItem("access_token");

  // 載入資料
  useEffect(() => {
    async function fetchData() {
      const token = getToken();

      try {
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const [pricingRes, subRes] = await Promise.all([
          fetch("/api/v1/billing/pricing", { headers }),
          fetch("/api/v1/billing/subscription", { headers }),
        ]);

        if (pricingRes.ok) {
          const pricingData = await pricingRes.json();
          setPlans(pricingData.plans);
        } else {
          setPlans(defaultPlans);
        }

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData);
        } else {
          setSubscription(defaultSubscription);
        }
      } catch (err) {
        console.error("Failed to fetch pricing data:", err);
        setPlans(defaultPlans);
        setSubscription(defaultSubscription);
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
      setToast({ type: "error", message: tc("pleaseLogin") });
      return;
    }

    // 確認升級
    const planNames: Record<string, string> = {
      free: "Free",
      pro: "Pro",
      agency: "Agency",
    };
    const planOrder = ["free", "pro", "agency"];
    const isUpgrade =
      planOrder.indexOf(plan) > planOrder.indexOf(subscription.plan);
    const action = isUpgrade ? t("upgrade") : t("change");

    if (!confirm(t("confirmUpgrade", { action, plan: planNames[plan] }))) {
      return;
    }

    setIsUpgrading(true);
    try {
      const response = await fetch("/api/v1/billing/subscription/upgrade", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscription(data);
        setToast({
          type: "success",
          message: t("upgradeSuccess", { action, plan: planNames[plan] }),
        });
      } else {
        setToast({
          type: "error",
          message: data.error?.message || data.detail || t("upgradeFailed"),
        });
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      setToast({ type: "error", message: t("upgradeRetry") });
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

  return (
    <div className="space-y-6">
      {/* Toast 通知 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200"
              : "bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-200"
          }`}
        >
          {toast.type === "success" ? (
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
            {tb("backToBilling")}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* 方案比較說明 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          {t("planDifference")}
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>
            • {t("commissionDesc")}
          </li>
          <li>
            • {t("aiQuotaDesc")}
          </li>
          <li>
            • {t("monthlyFeeDesc")}
          </li>
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
          {t("faq")}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {t("faqCommissionTitle")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("faqCommissionDesc")}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {t("faqQuotaTitle")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("faqQuotaDesc")}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {t("faqChangeTitle")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("faqChangeDesc")}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {t("faqBillingTitle")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("faqBillingDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
