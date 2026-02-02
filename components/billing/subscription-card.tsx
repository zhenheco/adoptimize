'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

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

interface SubscriptionCardProps {
  subscription: Subscription;
  showUpgradeButton?: boolean;
}

/**
 * 方案配置
 */
const PLAN_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  free: {
    label: 'Free',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: '基礎功能，適合個人使用',
  },
  pro: {
    label: 'Pro',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: '進階功能，適合專業行銷人員',
  },
  agency: {
    label: 'Agency',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: '完整功能，適合代理商',
  },
};

/**
 * 訂閱卡片元件
 */
export function SubscriptionCard({ subscription, showUpgradeButton = true }: SubscriptionCardProps) {
  const config = PLAN_CONFIG[subscription.plan] || PLAN_CONFIG.free;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 計算配額使用百分比
  const copywritingPercentage = subscription.monthly_copywriting_quota > 0
    ? Math.round((subscription.monthly_copywriting_used / subscription.monthly_copywriting_quota) * 100)
    : 0;

  const imagePercentage = subscription.monthly_image_quota > 0
    ? Math.round((subscription.monthly_image_used / subscription.monthly_image_quota) * 100)
    : 0;

  const isUnlimitedCopywriting = subscription.monthly_copywriting_quota === -1;
  const isUnlimitedImage = subscription.monthly_image_quota === -1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
          目前方案
        </CardTitle>
        <Crown className={`w-4 h-4 ${config.color}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 方案名稱和狀態 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${config.bgColor} ${config.color} border-0`}>
                {config.label}
              </Badge>
              {subscription.is_active && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="w-3 h-3 mr-1" />
                  啟用中
                </Badge>
              )}
            </div>
            {subscription.monthly_fee > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatAmount(subscription.monthly_fee)}/月
              </span>
            )}
          </div>

          {/* 方案描述 */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {config.description}
          </p>

          {/* 抽成費率 */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">操作抽成費率</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {subscription.commission_percent}%
            </span>
          </div>

          {/* 配額使用情況 */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              本月配額使用
            </h4>

            {/* 文案配額 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">AI 文案生成</span>
                <span className="text-gray-900 dark:text-white">
                  {isUnlimitedCopywriting
                    ? `${subscription.monthly_copywriting_used} / 無限`
                    : `${subscription.monthly_copywriting_used} / ${subscription.monthly_copywriting_quota}`
                  }
                </span>
              </div>
              {!isUnlimitedCopywriting && (
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      copywritingPercentage >= 90
                        ? 'bg-red-500'
                        : copywritingPercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(copywritingPercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* 圖片配額 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 dark:text-gray-400">AI 圖片生成</span>
                <span className="text-gray-900 dark:text-white">
                  {isUnlimitedImage
                    ? `${subscription.monthly_image_used} / 無限`
                    : `${subscription.monthly_image_used} / ${subscription.monthly_image_quota}`
                  }
                </span>
              </div>
              {!isUnlimitedImage && subscription.monthly_image_quota > 0 && (
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      imagePercentage >= 90
                        ? 'bg-red-500'
                        : imagePercentage >= 70
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(imagePercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 升級按鈕 */}
          {showUpgradeButton && subscription.plan !== 'agency' && (
            <Link href="/pricing">
              <Button variant="outline" className="w-full mt-2">
                升級方案
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
