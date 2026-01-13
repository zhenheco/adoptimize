'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAudiences, type AudienceFilters } from '@/hooks/use-audiences';
import { useAudienceOverlap } from '@/hooks/use-audience-overlap';
import { AudienceCard } from '@/components/audiences/audience-card';
import { OverlapChart } from '@/components/audiences/overlap-chart';
import { ExclusionSuggestion, type ExecuteExclusionParams } from '@/components/audiences/exclusion-suggestion';
import { ExpansionSuggestion, type CreateLookalikeParams } from '@/components/audiences/expansion-suggestion';
import { SuggestionWizard } from '@/components/audiences/smart-suggestion';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter, ChevronDown, ArrowUpDown, GitCompareArrows, ChevronUp, Sparkles, Users, Wand2 } from 'lucide-react';
import type { Audience } from '@/lib/api/types';
import type { AudienceOverlapPair } from '@/lib/utils/audience-overlap';
import { getExclusionPriority } from '@/lib/utils/exclusion-suggestions';
import { isSmallAudience, getExpansionPriority } from '@/lib/utils/expansion-suggestions';

/**
 * Tab 類型
 */
type AudienceTab = 'analysis' | 'suggestion';

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
  // Tab 狀態
  const [activeTab, setActiveTab] = useState<AudienceTab>('analysis');

  // TODO: 從 auth context 取得真實用戶資訊
  const mockUserId = 'demo-user-123';
  const mockAccountId = 'demo-account-456';

  const [filters, setFilters] = useState<AudienceFilters>({
    type: 'all',
    sortBy: 'health_score',
    sortOrder: 'desc',
  });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showOverlapChart, setShowOverlapChart] = useState(true);
  const [showExpansionSuggestions, setShowExpansionSuggestions] = useState(true);
  const [selectedOverlapPair, setSelectedOverlapPair] = useState<AudienceOverlapPair | null>(null);
  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(new Set());
  const [dismissedExpansions, setDismissedExpansions] = useState<Set<string>>(new Set());

  const { audiences, isLoading, error, pagination, refetch } = useAudiences(filters);
  const {
    audienceBaseList,
    overlapData,
    isLoading: isLoadingOverlap,
    fetchOverlapData,
  } = useAudienceOverlap(audiences);

  // 受眾資料載入後，自動獲取重疊資料
  useEffect(() => {
    if (audiences.length >= 2 && !isLoading) {
      fetchOverlapData();
    }
  }, [audiences, isLoading, fetchOverlapData]);

  // 建立受眾 ID 到 Audience 的映射，用於取得花費資料
  const audienceMap = useMemo(() => {
    const map = new Map<string, Audience>();
    audiences.forEach((a) => map.set(a.id, a));
    return map;
  }, [audiences]);

  // 計算可擴展的小受眾（用於顯示擴展建議）
  const expandableAudiences = useMemo(() => {
    return audiences.filter((audience) => {
      // 過濾已忽略的受眾
      if (dismissedExpansions.has(audience.id)) {
        return false;
      }
      // 只顯示小受眾且非 Lookalike 類型
      return isSmallAudience(audience) && audience.type !== 'LOOKALIKE';
    }).sort((a, b) => {
      // 按優先級排序（high > medium > low）
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 };
      const aPriority = priorityOrder[getExpansionPriority(a)] || 0;
      const bPriority = priorityOrder[getExpansionPriority(b)] || 0;
      return bPriority - aPriority;
    });
  }, [audiences, dismissedExpansions]);

  // 計算高風險重疊配對（用於自動顯示排除建議）
  const highRiskPairs = useMemo(() => {
    if (!audienceBaseList.length || !Object.keys(overlapData).length) {
      return [];
    }

    const pairs: AudienceOverlapPair[] = [];
    for (let i = 0; i < audienceBaseList.length; i++) {
      for (let j = i + 1; j < audienceBaseList.length; j++) {
        const a1 = audienceBaseList[i];
        const a2 = audienceBaseList[j];
        const key = `${a1.id}-${a2.id}`;
        const overlapCount = overlapData[key] || 0;
        const minSize = Math.min(a1.size, a2.size);
        const percentage = minSize > 0 ? Math.round((overlapCount / minSize) * 100 * 10) / 10 : 0;
        const priority = getExclusionPriority(percentage);

        // 只保留需要處理的配對（>= medium priority）
        if (priority !== 'none' && priority !== 'low') {
          const pairKey = `${a1.id}-${a2.id}`;
          // 過濾已忽略的配對
          if (!dismissedPairs.has(pairKey)) {
            pairs.push({
              audience1: a1,
              audience2: a2,
              overlapCount,
              overlapPercentage: percentage,
              status: percentage >= 30 ? 'high' : 'moderate',
            });
          }
        }
      }
    }

    // 按重疊率降序排序
    return pairs.sort((a, b) => b.overlapPercentage - a.overlapPercentage);
  }, [audienceBaseList, overlapData, dismissedPairs]);

  // 取得花費資料（從受眾的 metrics 中提取）
  const getSpendData = useCallback((pair: AudienceOverlapPair) => {
    const a1 = audienceMap.get(pair.audience1.id);
    const a2 = audienceMap.get(pair.audience2.id);
    return {
      audience1Spend: a1?.metrics.spend,
      audience2Spend: a2?.metrics.spend,
      audience1CPA: a1?.metrics.cpa,
      audience2CPA: a2?.metrics.cpa,
    };
  }, [audienceMap]);

  // 處理重疊配對點擊
  const handleOverlapCellClick = (pair: AudienceOverlapPair) => {
    // 只有高風險配對才顯示排除建議
    if (pair.status === 'high' || pair.status === 'moderate') {
      setSelectedOverlapPair(pair);
    }
  };

  // 處理執行排除
  const handleExecuteExclusion = useCallback(async (params: ExecuteExclusionParams) => {
    console.log('Executing exclusion:', params);
    // TODO: 呼叫 API 執行排除
    // 模擬 API 呼叫延遲
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // 執行成功後，將配對加入已處理清單
    const pairKey = `${params.sourceAudienceId}-${params.excludeAudienceId}`;
    setDismissedPairs((prev) => new Set(prev).add(pairKey));
    setSelectedOverlapPair(null);
    // 重新整理資料
    refetch();
  }, [refetch]);

  // 處理忽略/稍後處理
  const handleDismiss = useCallback((pair: AudienceOverlapPair) => {
    const pairKey = `${pair.audience1.id}-${pair.audience2.id}`;
    setDismissedPairs((prev) => new Set(prev).add(pairKey));
    setSelectedOverlapPair(null);
  }, []);

  // 處理建立 Lookalike
  const handleCreateLookalike = useCallback(async (params: CreateLookalikeParams) => {
    console.log('Creating Lookalike:', params);
    // TODO: 呼叫 API 建立 Lookalike
    // 模擬 API 呼叫延遲
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // 建立成功後，將受眾加入已處理清單
    setDismissedExpansions((prev) => new Set(prev).add(params.sourceAudienceId));
    // 重新整理資料
    refetch();
  }, [refetch]);

  // 處理忽略擴展建議
  const handleDismissExpansion = useCallback((audienceId: string) => {
    setDismissedExpansions((prev) => new Set(prev).add(audienceId));
  }, []);

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
            受眾管理
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            分析受眾效能或使用 AI 生成智慧建議
          </p>
        </div>
        {activeTab === 'analysis' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
        )}
      </div>

      {/* Tab 切換 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`
              flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors
              ${
                activeTab === 'analysis'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }
            `}
          >
            <Users className="w-4 h-4" />
            受眾分析
          </button>
          <button
            onClick={() => setActiveTab('suggestion')}
            className={`
              flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors
              ${
                activeTab === 'suggestion'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }
            `}
          >
            <Wand2 className="w-4 h-4" />
            智慧建議
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              AI
            </span>
          </button>
        </nav>
      </div>

      {/* 智慧建議 Tab */}
      {activeTab === 'suggestion' && (
        <SuggestionWizard userId={mockUserId} accountId={mockAccountId} />
      )}

      {/* 受眾分析 Tab */}
      {activeTab === 'analysis' && (
        <>
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

      {/* 受眾重疊分析圖表 */}
      {!isLoading && audiences.length >= 2 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowOverlapChart(!showOverlapChart)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <GitCompareArrows className="w-4 h-4" />
            <span>受眾重疊分析</span>
            {showOverlapChart ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showOverlapChart && (
            <OverlapChart
              audiences={audienceBaseList}
              overlapData={overlapData}
              loading={isLoadingOverlap}
              onCellClick={handleOverlapCellClick}
            />
          )}
        </div>
      )}

      {/* 排除建議卡片（選中的配對或最高風險配對） */}
      {!isLoading && !isLoadingOverlap && (selectedOverlapPair || highRiskPairs.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            排除建議
          </h2>
          {selectedOverlapPair ? (
            <ExclusionSuggestion
              pair={selectedOverlapPair}
              spendData={getSpendData(selectedOverlapPair)}
              onExecute={handleExecuteExclusion}
              onDismiss={() => handleDismiss(selectedOverlapPair)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {highRiskPairs.slice(0, 2).map((pair) => (
                <ExclusionSuggestion
                  key={`${pair.audience1.id}-${pair.audience2.id}`}
                  pair={pair}
                  spendData={getSpendData(pair)}
                  onExecute={handleExecuteExclusion}
                  onDismiss={() => handleDismiss(pair)}
                  defaultExpanded={false}
                />
              ))}
            </div>
          )}
          {highRiskPairs.length > 2 && !selectedOverlapPair && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              還有 {highRiskPairs.length - 2} 個需要處理的重疊配對，請在重疊矩陣中查看
            </p>
          )}
        </div>
      )}

      {/* 擴展建議卡片（小受眾建議建立 Lookalike） */}
      {!isLoading && expandableAudiences.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowExpansionSuggestions(!showExpansionSuggestions)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-gray-900 dark:text-white">
              擴展建議
            </span>
            <span className="text-gray-500">({expandableAudiences.length} 個小受眾)</span>
            {showExpansionSuggestions ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showExpansionSuggestions && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {expandableAudiences.slice(0, 4).map((audience) => (
                <ExpansionSuggestion
                  key={audience.id}
                  audience={audience}
                  onCreate={handleCreateLookalike}
                  onDismiss={() => handleDismissExpansion(audience.id)}
                  defaultExpanded={false}
                />
              ))}
            </div>
          )}
          {showExpansionSuggestions && expandableAudiences.length > 4 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              還有 {expandableAudiences.length - 4} 個小受眾可建立 Lookalike
            </p>
          )}
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
        </>
      )}
    </div>
  );
}
