'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('dashboard');

  if (!enabled) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">⚪</span>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('autopilotDisabled')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('autopilotDisabledDesc')}
              </p>
            </div>
          </div>
          <Link href="/autopilot">
            <Button>
              {t('enableNow')}
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
              {t('autopilotRunning')}
            </h2>
            <p className="text-sm text-green-700 dark:text-green-400">
              {daysSinceStart ? t('runningForDays', { days: daysSinceStart }) : t('autopilotRunning')}
              {totalSavings ? `，${t('savedAmount', { amount: totalSavings.toLocaleString() })}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm text-gray-600 dark:text-gray-300">
            {targetCpa && <p>{t('targetCostLabel', { amount: targetCpa })}</p>}
            {monthlyBudget && <p>{t('monthlyBudgetLabel', { amount: monthlyBudget.toLocaleString() })}</p>}
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
