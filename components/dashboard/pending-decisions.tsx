'use client';

import { Button } from '@/components/ui/button';

interface Decision {
  id: string;
  type: string;
  title: string;
  description: string;
  options: { label: string; value: string }[];
}

interface PendingDecisionsProps {
  decisions: Decision[];
  onDecide: (decisionId: string, value: string) => void;
}

export function PendingDecisions({ decisions, onDecide }: PendingDecisionsProps) {
  if (decisions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        📢 需要你決定的事
      </h2>

      <div className="space-y-4">
        {decisions.map((decision) => (
          <div
            key={decision.id}
            className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">📢</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {decision.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {decision.description}
                </p>
                <div className="flex gap-2 mt-4">
                  {decision.options.map((option) => (
                    <Button
                      key={option.value}
                      variant={option.value === 'ignore' ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => onDecide(decision.id, option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
