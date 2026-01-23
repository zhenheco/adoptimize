'use client';

import { cn } from '@/lib/utils';

interface SimpleMetricCardProps {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  status?: 'good' | 'warning' | 'bad';
}

const statusColors = {
  good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  bad: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function SimpleMetricCard({
  icon,
  title,
  value,
  subtitle,
  status,
}: SimpleMetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {value}
      </div>
      {subtitle && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </span>
          {status && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                statusColors[status]
              )}
            >
              {status === 'good' ? '良好' : status === 'warning' ? '注意' : '問題'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
