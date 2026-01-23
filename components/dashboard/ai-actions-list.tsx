'use client';

import Link from 'next/link';

interface AIAction {
  id: string;
  date: string;
  action: string;
  reason: string;
  savings?: number;
  earnings?: number;
}

interface AIActionsListProps {
  actions: AIAction[];
}

export function AIActionsList({ actions }: AIActionsListProps) {
  if (actions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🤖 AI 今天幫你做了什麼
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          目前還沒有執行任何動作
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          🤖 AI 今天幫你做了什麼
        </h2>
        <Link
          href="/autopilot"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          查看更多
        </Link>
      </div>

      <div className="space-y-3">
        {actions.slice(0, 3).map((action) => (
          <div
            key={action.id}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400 w-12">
                {action.date}
              </span>
              <div>
                <p className="text-gray-900 dark:text-white">{action.action}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {action.reason}
                </p>
              </div>
            </div>
            <div>
              {action.savings && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  省 ${action.savings.toLocaleString()}
                </span>
              )}
              {action.earnings && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  +${action.earnings.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
