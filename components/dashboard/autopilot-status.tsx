'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AutopilotStatusProps {
  enabled: boolean;
  targetCpa?: number;
  monthlyBudget?: number;
  daysSinceStart?: number;
  totalSavings?: number;
}

export function AutopilotStatus({
  enabled,
  targetCpa,
  monthlyBudget,
  daysSinceStart,
  totalSavings,
}: AutopilotStatusProps) {
  if (!enabled) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">⚪</span>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                自動駕駛未啟用
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                啟用後 AI 會自動幫你優化廣告，讓你省錢又省心
              </p>
            </div>
          </div>
          <Link href="/autopilot">
            <Button>
              立即啟用
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🟢</span>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              自動駕駛運作中
            </h2>
            <p className="text-sm text-green-700 dark:text-green-400">
              {daysSinceStart ? `已連續運作 ${daysSinceStart} 天` : '運作中'}
              {totalSavings ? `，幫你省下 $${totalSavings.toLocaleString()}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm text-gray-600 dark:text-gray-300">
            {targetCpa && <p>目標成本 ${targetCpa}/筆</p>}
            {monthlyBudget && <p>月預算 ${monthlyBudget.toLocaleString()}</p>}
          </div>
          <Link href="/autopilot">
            <Button variant="outline" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
