'use client';

import { Target, Users, ShoppingCart, Heart } from 'lucide-react';
import type { ObjectiveOption } from '@/lib/api/types';

/**
 * 目標圖示映射
 */
const OBJECTIVE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  AWARENESS: Target,
  CONSIDERATION: Users,
  CONVERSION: ShoppingCart,
  RETENTION: Heart,
};

/**
 * 目標顏色映射
 */
const OBJECTIVE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  AWARENESS: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  CONSIDERATION: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
  },
  CONVERSION: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-500',
    text: 'text-green-600 dark:text-green-400',
  },
  RETENTION: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
  },
};

interface ObjectiveSelectorProps {
  objectives: ObjectiveOption[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  disabled?: boolean;
}

/**
 * 廣告目標選擇器
 *
 * 顯示四種漏斗階段供用戶選擇
 */
export function ObjectiveSelector({
  objectives,
  selectedCode,
  onSelect,
  disabled = false,
}: ObjectiveSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          選擇廣告目標
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          根據您的行銷漏斗階段選擇合適的目標
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {objectives.map((objective) => {
          const Icon = OBJECTIVE_ICONS[objective.code] || Target;
          const colors = OBJECTIVE_COLORS[objective.code] || OBJECTIVE_COLORS.AWARENESS;
          const isSelected = selectedCode === objective.code;

          return (
            <button
              key={objective.code}
              onClick={() => onSelect(objective.code)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                ${
                  isSelected
                    ? `${colors.bg} ${colors.border}`
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected ? colors.bg : 'bg-gray-100 dark:bg-gray-700'}
                  `}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isSelected ? colors.text : 'text-gray-500 dark:text-gray-400'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${
                      isSelected ? colors.text : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {objective.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {objective.funnel_stage}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                    {objective.description}
                  </div>
                </div>
              </div>

              {/* 選中指示器 */}
              {isSelected && (
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
