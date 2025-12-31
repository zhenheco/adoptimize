'use client';

import { Users, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import type { Audience } from '@/lib/api/types';

/**
 * 格式化數字顯示
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * 格式化金額顯示
 */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 取得健康度狀態顏色
 */
function getHealthColor(score: number): {
  bg: string;
  text: string;
  ring: string;
} {
  if (score >= 80) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      ring: 'ring-green-500',
    };
  }
  if (score >= 60) {
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      ring: 'ring-yellow-500',
    };
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    ring: 'ring-red-500',
  };
}

/**
 * 取得受眾類型標籤
 */
function getTypeLabel(type: Audience['type']): {
  label: string;
  className: string;
} {
  switch (type) {
    case 'CUSTOM':
      return {
        label: '自訂受眾',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      };
    case 'LOOKALIKE':
      return {
        label: '類似受眾',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      };
    case 'SAVED':
      return {
        label: '儲存受眾',
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      };
  }
}

interface AudienceCardProps {
  audience: Audience;
  onClick?: (audience: Audience) => void;
}

/**
 * 受眾卡片元件
 *
 * 顯示受眾基本資訊、效能指標與健康度
 */
export function AudienceCard({ audience, onClick }: AudienceCardProps) {
  const healthColor = getHealthColor(audience.health_score);
  const typeInfo = getTypeLabel(audience.type);

  return (
    <div
      onClick={() => onClick?.(audience)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* 標題區 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeInfo.className}`}>
              {typeInfo.label}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {audience.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            來源: {audience.source}
          </p>
        </div>

        {/* 健康度指標 */}
        <div className={`flex flex-col items-center p-2 rounded-lg ${healthColor.bg}`}>
          <span className={`text-2xl font-bold ${healthColor.text}`}>
            {audience.health_score}
          </span>
          <span className={`text-xs ${healthColor.text}`}>健康度</span>
        </div>
      </div>

      {/* 受眾規模 */}
      <div className="flex items-center gap-2 mb-3 text-gray-600 dark:text-gray-300">
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">規模: {formatNumber(audience.size)}</span>
      </div>

      {/* 效能指標網格 */}
      <div className="grid grid-cols-2 gap-3">
        {/* CPA */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <DollarSign className="w-3 h-3" />
            CPA
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(audience.metrics.cpa)}
            </span>
            {audience.metrics.cpa < 20 ? (
              <TrendingDown className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingUp className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>

        {/* ROAS */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Target className="w-3 h-3" />
            ROAS
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-900 dark:text-white">
              {audience.metrics.roas.toFixed(2)}x
            </span>
            {audience.metrics.roas >= 1.5 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>

        {/* 轉換數 */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">轉換數</div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {audience.metrics.conversions}
          </span>
        </div>

        {/* 花費 */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">花費</div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(audience.metrics.spend)}
          </span>
        </div>
      </div>
    </div>
  );
}
