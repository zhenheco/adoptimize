'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles, Zap, Building2 } from 'lucide-react';

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

interface PricingTableProps {
  plans: Record<string, PlanConfig>;
  currentPlan?: string;
  onSelectPlan?: (plan: string) => void;
  isLoading?: boolean;
}

/**
 * 方案配置
 */
const PLAN_META: Record<string, {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  recommended?: boolean;
}> = {
  free: {
    name: 'Free',
    description: '免費入門，體驗基礎功能',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'text-gray-600',
    bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800',
  },
  pro: {
    name: 'Pro',
    description: '專業版，適合進階行銷需求',
    icon: <Zap className="w-6 h-6" />,
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    recommended: true,
  },
  agency: {
    name: 'Agency',
    description: '代理商專用，最低抽成費率',
    icon: <Building2 className="w-6 h-6" />,
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
  },
};

/**
 * 定價表元件
 */
export function PricingTable({ plans, currentPlan, onSelectPlan, isLoading }: PricingTableProps) {
  const planOrder = ['free', 'pro', 'agency'];

  function renderPlanButton(
    isCurrent: boolean,
    canUpgrade: boolean,
    canDowngrade: boolean,
    planKey: string
  ): React.ReactNode {
    if (isCurrent) {
      return (
        <Button variant="outline" className="w-full" disabled>
          目前方案
        </Button>
      );
    }

    if (canUpgrade) {
      return (
        <Button
          className="w-full"
          onClick={() => onSelectPlan?.(planKey)}
          disabled={isLoading}
        >
          {isLoading ? '處理中...' : '升級到此方案'}
        </Button>
      );
    }

    const buttonText = canDowngrade ? '降級到此方案' : '選擇此方案';
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => onSelectPlan?.(planKey)}
        disabled={isLoading}
      >
        {isLoading ? '處理中...' : buttonText}
      </Button>
    );
  }

  const formatAmount = (amount: number) => {
    if (amount === 0) return '免費';
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatQuota = (quota: number) => {
    if (quota === -1) return '無限';
    if (quota === 0) return '無';
    return `${quota} 次/月`;
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {planOrder.map((planKey) => {
        const plan = plans[planKey];
        const meta = PLAN_META[planKey];
        const isCurrent = currentPlan === planKey;
        const canUpgrade = !isCurrent && planOrder.indexOf(planKey) > planOrder.indexOf(currentPlan || 'free');
        const canDowngrade = !isCurrent && planOrder.indexOf(planKey) < planOrder.indexOf(currentPlan || 'free');

        if (!plan || !meta) return null;

        return (
          <Card
            key={planKey}
            className={`relative overflow-hidden transition-all ${
              meta.recommended ? 'ring-2 ring-blue-500 shadow-lg' : ''
            } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
          >
            {/* 推薦標籤 */}
            {meta.recommended && !isCurrent && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                推薦
              </div>
            )}

            {/* 目前方案標籤 */}
            {isCurrent && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                目前方案
              </div>
            )}

            <CardHeader className={`bg-gradient-to-br ${meta.bgGradient}`}>
              <div className="flex items-center gap-3">
                <div className={meta.color}>{meta.icon}</div>
                <div>
                  <CardTitle className="text-xl">{meta.name}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {meta.description}
                  </p>
                </div>
              </div>

              {/* 價格 */}
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(plan.monthly_fee)}
                </span>
                {plan.monthly_fee > 0 && (
                  <span className="text-gray-500 dark:text-gray-400">/月</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* 抽成費率 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    操作抽成費率
                  </span>
                  <Badge variant="secondary" className="font-semibold">
                    {plan.commission_percent}%
                  </Badge>
                </div>

                {/* 功能列表 */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  {/* AI 文案配額 */}
                  <div className="flex items-center gap-2">
                    {plan.monthly_copywriting_quota > 0 || plan.monthly_copywriting_quota === -1 ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      AI 文案生成：{formatQuota(plan.monthly_copywriting_quota)}
                    </span>
                  </div>

                  {/* AI 圖片配額 */}
                  <div className="flex items-center gap-2">
                    {plan.monthly_image_quota > 0 || plan.monthly_image_quota === -1 ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      AI 圖片生成：{formatQuota(plan.monthly_image_quota)}
                    </span>
                  </div>

                  {/* AI 受眾分析 */}
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      AI 受眾分析：{formatAmount(plan.ai_audience_price)}/次
                    </span>
                  </div>

                  {/* 超額文案價格 */}
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      文案超額：{formatAmount(plan.ai_copywriting_price)}/次
                    </span>
                  </div>

                  {/* 超額圖片價格 */}
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      圖片超額：{formatAmount(plan.ai_image_price)}/次
                    </span>
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="pt-4">
                  {renderPlanButton(isCurrent, canUpgrade, canDowngrade, planKey)}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
