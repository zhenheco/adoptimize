'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ImageIcon, AlertTriangle } from 'lucide-react';

interface QuotaStatus {
  quota: number;
  used: number;
  remaining: number;
}

interface AIQuotaCardProps {
  copywriting: QuotaStatus;
  image: QuotaStatus;
}

/**
 * AI 配額卡片元件
 */
export function AIQuotaCard({ copywriting, image }: AIQuotaCardProps) {
  const renderQuotaBar = (
    label: string,
    icon: React.ReactNode,
    quota: QuotaStatus,
    color: string
  ) => {
    const isUnlimited = quota.quota === -1;
    const percentage = isUnlimited ? 0 : Math.round((quota.used / quota.quota) * 100);
    const isWarning = !isUnlimited && percentage >= 80;
    const isCritical = !isUnlimited && percentage >= 95;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={color}>{icon}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isCritical && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isUnlimited
                ? `已用 ${quota.used}`
                : `${quota.used} / ${quota.quota}`
              }
            </span>
          </div>
        </div>
        {!isUnlimited && (
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all rounded-full ${
                isCritical
                  ? 'bg-red-500'
                  : isWarning
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
        {isUnlimited && (
          <div className="h-2 bg-gradient-to-r from-green-200 to-green-400 dark:from-green-800 dark:to-green-600 rounded-full" />
        )}
        {!isUnlimited && (
          <p className={`text-xs ${
            isCritical
              ? 'text-red-500'
              : isWarning
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            {isCritical
              ? '配額即將用盡！'
              : isWarning
              ? '配額使用較多，請注意'
              : `剩餘 ${quota.remaining} 次`
            }
          </p>
        )}
        {isUnlimited && (
          <p className="text-xs text-green-600 dark:text-green-400">
            無限配額
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">AI 配額使用狀況</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderQuotaBar(
          'AI 文案生成',
          <Sparkles className="w-4 h-4" />,
          copywriting,
          'text-pink-500'
        )}
        {renderQuotaBar(
          'AI 圖片生成',
          <ImageIcon className="w-4 h-4" />,
          image,
          'text-indigo-500'
        )}
      </CardContent>
    </Card>
  );
}
