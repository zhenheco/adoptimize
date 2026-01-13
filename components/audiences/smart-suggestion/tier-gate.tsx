'use client';

import { Lock, ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SubscriptionTier } from '@/lib/api/types';

interface TierGateProps {
  /** 目前用戶的訂閱層級 */
  currentTier: SubscriptionTier;
  /** 功能所需的最低層級 */
  requiredTier: SubscriptionTier;
  /** 功能名稱 */
  featureName: string;
  /** 功能描述 */
  featureDescription: string;
  /** 子元件（解鎖時顯示） */
  children: React.ReactNode;
  /** 自定義升級連結 */
  upgradeUrl?: string;
}

/**
 * 訂閱層級優先順序
 */
const TIER_PRIORITY: Record<SubscriptionTier, number> = {
  STARTER: 1,
  PROFESSIONAL: 2,
  AGENCY: 3,
  ENTERPRISE: 4,
};

/**
 * 層級名稱映射
 */
const TIER_NAMES: Record<SubscriptionTier, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  AGENCY: 'Agency',
  ENTERPRISE: 'Enterprise',
};

/**
 * 層級價格映射（每月，新台幣）
 */
const TIER_PRICES: Record<SubscriptionTier, number> = {
  STARTER: 1500,
  PROFESSIONAL: 3200,
  AGENCY: 7500,
  ENTERPRISE: 15000,
};

/**
 * 訂閱門檻元件
 *
 * 根據用戶訂閱層級決定是否顯示功能或升級提示
 */
export function TierGate({
  currentTier,
  requiredTier,
  featureName,
  featureDescription,
  children,
  upgradeUrl = '/settings/subscription',
}: TierGateProps) {
  const hasAccess = TIER_PRIORITY[currentTier] >= TIER_PRIORITY[requiredTier];

  // 如果有權限，直接顯示子元件
  if (hasAccess) {
    return <>{children}</>;
  }

  // 顯示升級提示
  return (
    <div className="relative">
      {/* 模糊背景（預覽效果） */}
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>

      {/* 升級覆蓋層 */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            升級至 {TIER_NAMES[requiredTier]} 方案
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {featureDescription}
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>{featureName}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              NT${TIER_PRICES[requiredTier].toLocaleString()}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/月</span>
            </div>
          </div>

          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            onClick={() => window.location.href = upgradeUrl}
          >
            升級方案
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </Button>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            目前方案：{TIER_NAMES[currentTier]}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 簡易訂閱提示元件（不帶模糊效果）
 */
export function TierBadge({
  requiredTier,
  className = '',
}: {
  requiredTier: SubscriptionTier;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white ${className}`}
    >
      <Lock className="w-3 h-3" />
      {TIER_NAMES[requiredTier]}+
    </span>
  );
}
