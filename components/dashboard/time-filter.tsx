'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, ChevronDown } from 'lucide-react';
import type { TimePeriod } from '@/lib/api/types';

/**
 * 時間篩選選項配置
 */
const filterOptions: { value: TimePeriod; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: '7d', label: '過去 7 天' },
  { value: '30d', label: '過去 30 天' },
  { value: 'custom', label: '自訂範圍' },
];

/**
 * TimeFilter 元件屬性
 */
interface TimeFilterProps {
  /** 當前選中的時間週期 */
  value?: TimePeriod;
  /** 時間週期變更時的回呼函數 */
  onChange?: (period: TimePeriod) => void;
}

/**
 * 時間篩選器元件
 * 提供時間範圍選擇功能，支援受控與非受控模式
 *
 * @example
 * // 受控模式（推薦）
 * const [period, setPeriod] = useState<TimePeriod>('7d');
 * <TimeFilter value={period} onChange={setPeriod} />
 *
 * @example
 * // 非受控模式（向後相容）
 * <TimeFilter />
 */
export function TimeFilter({ value, onChange }: TimeFilterProps) {
  const [internalSelected, setInternalSelected] = useState<TimePeriod>('7d');
  const [isOpen, setIsOpen] = useState(false);

  // 支援受控與非受控模式
  const selected = value ?? internalSelected;
  const selectedOption = filterOptions.find((opt) => opt.value === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>{selectedOption?.label}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* 下拉選單 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          {/* 選單內容 */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-1">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (onChange) {
                      onChange(option.value);
                    } else {
                      setInternalSelected(option.value);
                    }
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                    selected === option.value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
