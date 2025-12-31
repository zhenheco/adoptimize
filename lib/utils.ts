import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合併 Tailwind CSS 類別名稱
 * 處理類別衝突並移除重複
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化數字為可讀格式
 * @example formatNumber(1234567) => "1,234,567"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value);
}

/**
 * 格式化貨幣
 * @example formatCurrency(1234.56) => "$1,234.56"
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * 格式化百分比變化
 * @example formatChange(12.5) => "+12.5%"
 * @example formatChange(-5.2) => "-5.2%"
 */
export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * 根據狀態類型取得對應的 CSS 類別
 */
export function getStatusColor(status: 'normal' | 'warning' | 'danger'): string {
  switch (status) {
    case 'normal':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/50';
    case 'danger':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/50';
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/50';
  }
}

/**
 * 取得狀態圖示
 */
export function getStatusIcon(status: 'normal' | 'warning' | 'danger'): string {
  switch (status) {
    case 'normal':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'danger':
      return '🔴';
    default:
      return '⚪';
  }
}
