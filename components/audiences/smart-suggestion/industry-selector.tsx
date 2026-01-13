'use client';

import {
  ShoppingBag,
  Wrench,
  GraduationCap,
  Heart,
  Building2,
  UtensilsCrossed,
  Plane,
  Gamepad2,
} from 'lucide-react';
import type { IndustryOption } from '@/lib/api/types';

/**
 * 產業圖示映射
 */
const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ECOMMERCE: ShoppingBag,
  SERVICES: Wrench,
  EDUCATION: GraduationCap,
  HEALTH: Heart,
  FINANCE: Building2,
  FOOD: UtensilsCrossed,
  TRAVEL: Plane,
  ENTERTAINMENT: Gamepad2,
};

/**
 * 產業顏色映射
 */
const INDUSTRY_COLORS: Record<string, string> = {
  ECOMMERCE: 'text-pink-600 dark:text-pink-400',
  SERVICES: 'text-blue-600 dark:text-blue-400',
  EDUCATION: 'text-indigo-600 dark:text-indigo-400',
  HEALTH: 'text-red-600 dark:text-red-400',
  FINANCE: 'text-emerald-600 dark:text-emerald-400',
  FOOD: 'text-orange-600 dark:text-orange-400',
  TRAVEL: 'text-cyan-600 dark:text-cyan-400',
  ENTERTAINMENT: 'text-purple-600 dark:text-purple-400',
};

interface IndustrySelectorProps {
  industries: IndustryOption[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  disabled?: boolean;
}

/**
 * 產業選擇器
 *
 * 顯示八種產業類別供用戶選擇
 */
export function IndustrySelector({
  industries,
  selectedCode,
  onSelect,
  disabled = false,
}: IndustrySelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          選擇產業類別
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          選擇最符合您業務的產業，AI 將依據產業基準生成建議
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {industries.map((industry) => {
          const Icon = INDUSTRY_ICONS[industry.code] || Building2;
          const iconColor = INDUSTRY_COLORS[industry.code] || 'text-gray-600';
          const isSelected = selectedCode === industry.code;

          return (
            <button
              key={industry.code}
              onClick={() => onSelect(industry.code)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-center
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${isSelected ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}
                  `}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600 dark:text-blue-400' : iconColor}`} />
                </div>
                <div
                  className={`font-medium text-sm ${
                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {industry.name}
                </div>
              </div>

              {/* 選中指示器 */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
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
