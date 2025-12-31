'use client';

import { useState } from 'react';
import { useHealthAudit } from '@/hooks/use-health-audit';
import { ScoreRing, DimensionCard, IssueCard } from '@/components/health';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter } from 'lucide-react';

/**
 * 骨架屏元件
 */
function HealthSkeleton() {
  return (
    <div className="space-y-6">
      {/* 總分卡片骨架 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="w-40 h-40 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            </div>
          </div>
        </div>
      </div>

      {/* 維度卡片骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 維度標籤對照
 */
const dimensionLabels: Record<string, string> = {
  structure: '帳戶結構',
  creative: '素材品質',
  audience: '受眾設定',
  budget: '預算配置',
  tracking: '追蹤設定',
};

/**
 * 類別篩選按鈕
 */
function CategoryFilter({
  value,
  current,
  label,
  count,
  onClick,
}: {
  value: string;
  current: string;
  label: string;
  count: number;
  onClick: (value: string) => void;
}) {
  const isActive = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1 ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * 帳戶健檢頁面
 *
 * 顯示 5 維度健康評分與問題清單
 */
export default function HealthPage() {
  const { audit, issues, isLoading, error, triggerAudit, resolveIssue, ignoreIssue } =
    useHealthAudit();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 過濾問題
  const filteredIssues = issues.filter((issue) => {
    if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false;
    return true;
  });

  // 計算各類別問題數量
  const categoryCounts: Record<string, number> = {
    all: issues.filter((i) => i.status === 'open').length,
    STRUCTURE: issues.filter((i) => i.category === 'STRUCTURE' && i.status === 'open').length,
    CREATIVE: issues.filter((i) => i.category === 'CREATIVE' && i.status === 'open').length,
    AUDIENCE: issues.filter((i) => i.category === 'AUDIENCE' && i.status === 'open').length,
    BUDGET: issues.filter((i) => i.category === 'BUDGET' && i.status === 'open').length,
    TRACKING: issues.filter((i) => i.category === 'TRACKING' && i.status === 'open').length,
  };

  // 開啟問題數量
  const openIssuesCount = issues.filter((i) => i.status === 'open').length;
  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL' && i.status === 'open').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              帳戶健檢
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              5 維度帳戶評分與問題診斷
            </p>
          </div>
        </div>
        <HealthSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              帳戶健檢
            </h1>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            載入健檢數據時發生錯誤: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              帳戶健檢
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              5 維度帳戶評分與問題診斷
            </p>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            尚無健檢數據
          </p>
          <Button className="mt-4" onClick={triggerAudit}>
            開始健檢
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題與操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            帳戶健檢
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            5 維度帳戶評分與問題診斷
          </p>
        </div>
        <Button onClick={triggerAudit} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          重新健檢
        </Button>
      </div>

      {/* 總分卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={audit.overall_score} grade={audit.grade} size={180} />
            <div className="text-center md:text-left">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                整體健康分數
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                最後檢查時間：{new Date(audit.created_at).toLocaleString('zh-TW')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {openIssuesCount > 0 && (
                  <span className="text-sm px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                    {openIssuesCount} 個待處理問題
                  </span>
                )}
                {criticalCount > 0 && (
                  <span className="text-sm px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                    {criticalCount} 個嚴重問題
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 維度分數卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(audit.dimensions).map(([key, dim]) => (
          <DimensionCard
            key={key}
            name={key}
            label={dimensionLabels[key] || key}
            dimension={dim}
            onClick={() => setCategoryFilter(key.toUpperCase())}
          />
        ))}
      </div>

      {/* 問題清單區塊 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              問題清單
            </h2>
            {/* 類別篩選 */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <CategoryFilter
                value="all"
                current={categoryFilter}
                label="全部"
                count={categoryCounts.all}
                onClick={setCategoryFilter}
              />
              <CategoryFilter
                value="CREATIVE"
                current={categoryFilter}
                label="素材"
                count={categoryCounts.CREATIVE}
                onClick={setCategoryFilter}
              />
              <CategoryFilter
                value="AUDIENCE"
                current={categoryFilter}
                label="受眾"
                count={categoryCounts.AUDIENCE}
                onClick={setCategoryFilter}
              />
              <CategoryFilter
                value="BUDGET"
                current={categoryFilter}
                label="預算"
                count={categoryCounts.BUDGET}
                onClick={setCategoryFilter}
              />
              <CategoryFilter
                value="TRACKING"
                current={categoryFilter}
                label="追蹤"
                count={categoryCounts.TRACKING}
                onClick={setCategoryFilter}
              />
            </div>
          </div>
        </div>

        {/* 問題列表 */}
        <div className="p-4 space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {categoryFilter === 'all'
                ? '太棒了！目前沒有待處理的問題'
                : '此類別沒有待處理的問題'}
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onResolve={resolveIssue}
                onIgnore={ignoreIssue}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
