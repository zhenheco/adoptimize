'use client';

import { useState } from 'react';
import { useAudiences, type AudienceFilters } from '@/hooks/use-audiences';
import { AudienceCard } from '@/components/audiences/audience-card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter, ChevronDown, ArrowUpDown } from 'lucide-react';
import type { Audience } from '@/lib/api/types';

/**
 * 受眾列表骨架屏
 */
function AudiencesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
            <div className="h-14 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 篩選按鈕元件
 */
function FilterButton({
  label,
  value,
  current,
  onClick,
}: {
  label: string;
  value: string;
  current: string;
  onClick: (value: string) => void;
}) {
  const isActive = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * 排序選項
 */
const SORT_OPTIONS: { value: AudienceFilters['sortBy']; label: string }[] = [
  { value: 'health_score', label: '健康度' },
  { value: 'cpa', label: 'CPA (低到高)' },
  { value: 'roas', label: 'ROAS (高到低)' },
  { value: 'conversions', label: '轉換數' },
  { value: 'size', label: '受眾規模' },
  { value: 'spend', label: '花費' },
];

/**
 * 受眾分析頁面
 *
 * 顯示受眾清單、效能排名與健康度分析
 */
export default function AudiencesPage() {
  const [filters, setFilters] = useState<AudienceFilters>({
    type: 'all',
    sortBy: 'health_score',
    sortOrder: 'desc',
  });
  const [showSortMenu, setShowSortMenu] = useState(false);

  const { audiences, isLoading, error, pagination, refetch } = useAudiences(filters);

  // 處理受眾點擊（未來可開啟詳情頁）
  const handleAudienceClick = (audience: Audience) => {
    console.log('Opening audience detail:', audience.id);
    // TODO: 開啟受眾詳情 modal 或導航到詳情頁
  };

  // 處理類型篩選變更
  const handleTypeFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      type: value as AudienceFilters['type'],
    }));
  };

  // 處理排序變更
  const handleSortChange = (sortBy: AudienceFilters['sortBy']) => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      // CPA 預設升序（越低越好），其他預設降序
      sortOrder: sortBy === 'cpa' ? 'asc' : 'desc',
    }));
    setShowSortMenu(false);
  };

  // 計算各類型數量
  const customCount = audiences.filter((a) => a.type === 'CUSTOM').length;
  const lookalikeCount = audiences.filter((a) => a.type === 'LOOKALIKE').length;
  const savedCount = audiences.filter((a) => a.type === 'SAVED').length;

  // 計算健康度統計
  const healthyCount = audiences.filter((a) => a.health_score >= 80).length;
  const warningCount = audiences.filter((a) => a.health_score >= 60 && a.health_score < 80).length;
  const criticalCount = audiences.filter((a) => a.health_score < 60).length;

  // 取得當前排序標籤
  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === filters.sortBy)?.label || '健康度';

  return (
    <div className="space-y-6">
      {/* 頁面標題與操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            受眾分析
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            分析受眾效能、檢測健康度與效能排名
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      </div>

      {/* 健康度摘要 */}
      {!isLoading && audiences.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{healthyCount}</div>
            <div className="text-sm text-green-700 dark:text-green-300 mt-1">健康受眾</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{warningCount}</div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">需關注受眾</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{criticalCount}</div>
            <div className="text-sm text-red-700 dark:text-red-300 mt-1">需改善受眾</div>
          </div>
        </div>
      )}

      {/* 篩選與排序 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">受眾類型:</span>
          <div className="flex gap-1">
            <FilterButton
              label={`全部 (${pagination.total})`}
              value="all"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
            <FilterButton
              label={`自訂 (${customCount})`}
              value="CUSTOM"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
            <FilterButton
              label={`類似 (${lookalikeCount})`}
              value="LOOKALIKE"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
            <FilterButton
              label={`儲存 (${savedCount})`}
              value="SAVED"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
          </div>
        </div>

        {/* 排序下拉選單 */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">排序: {currentSortLabel}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                    filters.sortBy === option.value
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 受眾列表 */}
      {isLoading ? (
        <AudiencesSkeleton />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            載入受眾時發生錯誤: {error.message}
          </p>
        </div>
      ) : audiences.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">找不到符合條件的受眾</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">請嘗試調整篩選條件</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiences.map((audience) => (
              <AudienceCard
                key={audience.id}
                audience={audience}
                onClick={handleAudienceClick}
              />
            ))}
          </div>

          {/* 分頁資訊 */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              共 {pagination.total} 個受眾，第 {pagination.page} / {pagination.totalPages} 頁
            </span>
            {/* TODO: 分頁按鈕 */}
          </div>
        </>
      )}
    </div>
  );
}
