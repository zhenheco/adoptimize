'use client';

import { useState, useCallback } from 'react';
import { useActionHistory, type ActionHistoryFilters } from '@/hooks/use-action-history';
import {
  formatActionType,
  formatTargetType,
  getTimeAgo,
  groupHistoryByDate,
  type ActionHistoryItem,
} from '@/lib/utils/action-history';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  Pause,
  Play,
  TrendingDown,
  Users,
  Settings,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

/**
 * 取得操作類型圖示元件
 */
function ActionTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'PAUSE':
      return <Pause className="w-4 h-4" />;
    case 'ENABLE':
      return <Play className="w-4 h-4" />;
    case 'BUDGET_CHANGE':
      return <TrendingDown className="w-4 h-4" />;
    case 'EXCLUDE_AUDIENCE':
      return <Users className="w-4 h-4" />;
    default:
      return <Settings className="w-4 h-4" />;
  }
}

/**
 * 歷史記錄卡片元件
 */
function HistoryCard({
  item,
  onRevert,
  isReverting,
}: {
  item: ActionHistoryItem;
  onRevert: (item: ActionHistoryItem) => void;
  isReverting: boolean;
}) {
  const actionLabel = formatActionType(item.action_type);
  const targetLabel = formatTargetType(item.target_type);
  const timeAgo = getTimeAgo(item.created_at);

  // 根據操作類型決定背景色
  const getBgColor = () => {
    switch (item.action_type) {
      case 'PAUSE':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'ENABLE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'BUDGET_CHANGE':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      case 'EXCLUDE_AUDIENCE':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border ${
        item.reverted
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* 操作類型圖示 */}
      <div className={`p-2 rounded-lg ${getBgColor()}`}>
        <ActionTypeIcon type={item.action_type} />
      </div>

      {/* 內容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {actionLabel}
          </span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-600 dark:text-gray-300">
            {targetLabel}: {item.target_name || item.target_id}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span>{timeAgo}</span>
          {item.reverted && (
            <>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">已還原</span>
            </>
          )}
        </div>
      </div>

      {/* 還原按鈕 */}
      {!item.reverted && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRevert(item)}
          disabled={isReverting}
        >
          {isReverting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4 mr-1" />
          )}
          還原
        </Button>
      )}
      {item.reverted && (
        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>已還原</span>
        </div>
      )}
    </div>
  );
}

/**
 * 篩選下拉選單
 */
function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={label}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * 骨架屏元件
 */
function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
          <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * 操作歷史頁面
 */
export default function ActionHistoryPage() {
  const [filters, setFilters] = useState<ActionHistoryFilters>({
    days: 30,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const { history, isLoading, error, refetch, revertAction } =
    useActionHistory(filters);

  // 處理搜尋
  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchQuery || undefined,
    }));
  }, [searchQuery]);

  // 處理還原
  const handleRevert = useCallback(
    async (item: ActionHistoryItem) => {
      setRevertingId(item.id);
      try {
        await revertAction(item);
      } catch (err) {
        console.error('Revert failed:', err);
      } finally {
        setRevertingId(null);
      }
    },
    [revertAction]
  );

  // 分組歷史記錄
  const groupedHistory = groupHistoryByDate(history);

  // 操作類型選項
  const actionTypeOptions = [
    { value: '', label: '全部操作' },
    { value: 'PAUSE', label: '暫停' },
    { value: 'ENABLE', label: '啟用' },
    { value: 'BUDGET_CHANGE', label: '調整預算' },
    { value: 'EXCLUDE_AUDIENCE', label: '排除受眾' },
  ];

  // 目標類型選項
  const targetTypeOptions = [
    { value: '', label: '全部類型' },
    { value: 'CREATIVE', label: '素材' },
    { value: 'CAMPAIGN', label: '活動' },
    { value: 'ADSET', label: '廣告組' },
    { value: 'AD', label: '廣告' },
    { value: 'AUDIENCE', label: '受眾' },
  ];

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/actions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              操作歷史
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              查看過去 30 天的所有操作記錄
            </p>
          </div>
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

      {/* 篩選器 */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        {/* 搜尋框 */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜尋目標名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            搜尋
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />

          <FilterDropdown
            label="操作類型"
            value={filters.action_type || ''}
            options={actionTypeOptions}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                action_type: value || undefined,
              }))
            }
          />

          <FilterDropdown
            label="目標類型"
            value={filters.target_type || ''}
            options={targetTypeOptions}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                target_type: value || undefined,
              }))
            }
          />
        </div>
      </div>

      {/* 歷史記錄列表 */}
      {isLoading ? (
        <HistorySkeleton />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            載入歷史記錄時發生錯誤: {error.message}
          </p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            沒有找到操作記錄
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            請嘗試調整篩選條件
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedHistory.map((group) => (
            <div key={group.date}>
              {/* 日期標題 */}
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                {group.label}
              </h3>
              {/* 該日期的記錄 */}
              <div className="space-y-2">
                {group.items.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    onRevert={handleRevert}
                    isReverting={revertingId === item.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 提示訊息 */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          💡 提示：還原操作會將目標恢復到操作前的狀態。已還原的操作無法再次還原。
        </p>
      </div>
    </div>
  );
}
