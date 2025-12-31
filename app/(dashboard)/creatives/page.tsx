'use client';

import { useState } from 'react';
import { useCreatives, type CreativeFilters } from '@/hooks/use-creatives';
import { CreativeCard } from '@/components/creatives/creative-card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter, AlertTriangle } from 'lucide-react';
import type { Creative } from '@/lib/api/types';

/**
 * 素材列表骨架屏
 */
function CreativesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded" />
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
 * 素材管理頁面
 *
 * 顯示所有廣告素材及其效能指標
 * 支援篩選、排序和分頁
 */
export default function CreativesPage() {
  const [filters, setFilters] = useState<CreativeFilters>({
    fatigueStatus: 'all',
    type: 'all',
    sortBy: 'fatigue',
    sortOrder: 'desc',
  });

  const { creatives, isLoading, error, pagination, refetch, toggleStatus } =
    useCreatives(filters);

  // 處理素材點擊（未來可開啟詳情頁）
  const handleCreativeClick = (creative: Creative) => {
    console.log('Opening creative detail:', creative.id);
    // TODO: 開啟素材詳情 modal 或導航到詳情頁
  };

  // 處理疲勞狀態篩選變更
  const handleFatigueFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      fatigueStatus: value as CreativeFilters['fatigueStatus'],
    }));
  };

  // 處理素材類型篩選變更
  const handleTypeFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      type: value as CreativeFilters['type'],
    }));
  };

  // 計算各狀態數量（用於顯示）
  const fatigueCount = creatives.filter(
    (c) => c.fatigue.status === 'fatigued'
  ).length;
  const warningCount = creatives.filter(
    (c) => c.fatigue.status === 'warning'
  ).length;

  return (
    <div className="space-y-6">
      {/* 頁面標題與操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            素材管理
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            管理廣告素材、追蹤疲勞度與效能
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          重新整理
        </Button>
      </div>

      {/* 疲勞警示摘要 */}
      {(fatigueCount > 0 || warningCount > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
              素材健康警示
            </span>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
            {fatigueCount > 0 && (
              <span className="mr-4">🔴 {fatigueCount} 個素材已疲勞，建議立即更換</span>
            )}
            {warningCount > 0 && (
              <span>🟡 {warningCount} 個素材需要關注</span>
            )}
          </p>
        </div>
      )}

      {/* 篩選器 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            疲勞狀態:
          </span>
          <div className="flex gap-1">
            <FilterButton
              label="全部"
              value="all"
              current={filters.fatigueStatus || 'all'}
              onClick={handleFatigueFilterChange}
            />
            <FilterButton
              label="🟢 健康"
              value="healthy"
              current={filters.fatigueStatus || 'all'}
              onClick={handleFatigueFilterChange}
            />
            <FilterButton
              label="🟡 注意"
              value="warning"
              current={filters.fatigueStatus || 'all'}
              onClick={handleFatigueFilterChange}
            />
            <FilterButton
              label="🔴 疲勞"
              value="fatigued"
              current={filters.fatigueStatus || 'all'}
              onClick={handleFatigueFilterChange}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            素材類型:
          </span>
          <div className="flex gap-1">
            <FilterButton
              label="全部"
              value="all"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
            <FilterButton
              label="圖片"
              value="IMAGE"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
            <FilterButton
              label="影片"
              value="VIDEO"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
            <FilterButton
              label="輪播"
              value="CAROUSEL"
              current={filters.type || 'all'}
              onClick={handleTypeFilterChange}
            />
          </div>
        </div>
      </div>

      {/* 素材列表 */}
      {isLoading ? (
        <CreativesSkeleton />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            載入素材時發生錯誤: {error.message}
          </p>
        </div>
      ) : creatives.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            找不到符合條件的素材
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            請嘗試調整篩選條件
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creatives.map((creative) => (
              <CreativeCard
                key={creative.id}
                creative={creative}
                onClick={handleCreativeClick}
                onToggleStatus={toggleStatus}
              />
            ))}
          </div>

          {/* 分頁資訊 */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              共 {pagination.total} 個素材，第 {pagination.page} /{' '}
              {pagination.totalPages} 頁
            </span>
            {/* TODO: 分頁按鈕 */}
          </div>
        </>
      )}
    </div>
  );
}
