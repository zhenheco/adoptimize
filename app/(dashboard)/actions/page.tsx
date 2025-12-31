'use client';

import { useState } from 'react';
import { useRecommendations, type RecommendationFilters } from '@/hooks/use-recommendations';
import { RecommendationCard } from '@/components/actions/recommendation-card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter, TrendingUp, CheckCircle2, Ban, Clock } from 'lucide-react';

/**
 * 建議列表骨架屏
 */
function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1">
              <div className="flex gap-2 mb-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              </div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
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
  icon: Icon,
}: {
  label: string;
  value: string;
  current: string;
  onClick: (value: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const isActive = value === current;
  return (
    <button
      onClick={() => onClick(value)}
      className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

/**
 * 行動中心頁面
 *
 * 顯示建議清單與一鍵執行功能
 */
export default function ActionsPage() {
  const [filters, setFilters] = useState<RecommendationFilters>({
    status: 'pending',
  });

  const {
    recommendations,
    isLoading,
    error,
    total,
    refetch,
    executeRecommendation,
    ignoreRecommendation,
  } = useRecommendations(filters);

  // 處理狀態篩選變更
  const handleStatusFilterChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value as RecommendationFilters['status'],
    }));
  };

  // 計算各狀態數量
  const pendingCount = recommendations.filter((r) => r.status === 'pending').length;
  const executedCount = recommendations.filter((r) => r.status === 'executed').length;
  const ignoredCount = recommendations.filter((r) => r.status === 'ignored').length;

  // 計算總預估節省金額
  const totalEstimatedSavings = recommendations
    .filter((r) => r.status === 'pending')
    .reduce((sum, r) => sum + r.estimated_impact, 0);

  return (
    <div className="space-y-6">
      {/* 頁面標題與操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            行動中心
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            依優先順序執行優化建議
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

      {/* 摘要卡片 */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">待處理</span>
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{pendingCount}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">已執行</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{executedCount}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
              <Ban className="w-4 h-4" />
              <span className="text-sm">已忽略</span>
            </div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{ignoredCount}</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">預估週節省</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              ${totalEstimatedSavings.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* 篩選器 */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">狀態:</span>
        <div className="flex gap-1">
          <FilterButton
            label="待處理"
            value="pending"
            current={filters.status || 'pending'}
            onClick={handleStatusFilterChange}
            icon={Clock}
          />
          <FilterButton
            label="已執行"
            value="executed"
            current={filters.status || 'pending'}
            onClick={handleStatusFilterChange}
            icon={CheckCircle2}
          />
          <FilterButton
            label="已忽略"
            value="ignored"
            current={filters.status || 'pending'}
            onClick={handleStatusFilterChange}
            icon={Ban}
          />
          <FilterButton
            label="全部"
            value="all"
            current={filters.status || 'pending'}
            onClick={handleStatusFilterChange}
          />
        </div>
      </div>

      {/* 建議清單 */}
      {isLoading ? (
        <RecommendationsSkeleton />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            載入建議時發生錯誤: {error.message}
          </p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          {filters.status === 'pending' ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                太棒了！沒有待處理的建議
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                您的廣告帳戶狀態良好
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                找不到符合條件的建議
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                請嘗試調整篩選條件
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onExecute={executeRecommendation}
              onIgnore={ignoreRecommendation}
            />
          ))}
        </div>
      )}

      {/* 操作歷史提示 */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            提示：已執行和已忽略的建議會在 24 小時後自動歸檔。切換上方篩選器查看歷史記錄。
          </span>
        </div>
      </div>
    </div>
  );
}
