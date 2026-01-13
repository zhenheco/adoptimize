'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import {
  calculateOverlapPercentage,
  getOverlapStatus,
  getOverlapSuggestion,
  sortOverlapPairsByRisk,
  type AudienceBase,
  type AudienceOverlapPair,
  type OverlapStatus,
} from '@/lib/utils/audience-overlap';

/**
 * OverlapChart 元件屬性
 */
export interface OverlapChartProps {
  /** 受眾列表 */
  audiences: AudienceBase[];
  /** 重疊數據，key 格式為 "id1-id2" */
  overlapData: Record<string, number>;
  /** 載入中狀態 */
  loading?: boolean;
  /** 精簡模式（手機版） */
  compact?: boolean;
  /** 點擊儲存格時的回調 */
  onCellClick?: (pair: AudienceOverlapPair) => void;
}

/**
 * 單一儲存格的 Tooltip 內容
 */
interface TooltipData {
  audience1: AudienceBase;
  audience2: AudienceBase;
  overlapCount: number;
  percentage: number;
  status: OverlapStatus;
}

/**
 * 取得強度等級（用於顏色深淺）
 */
function getIntensityLevel(percentage: number): string {
  if (percentage >= 80) return 'very-high';
  if (percentage >= 50) return 'high';
  if (percentage >= 30) return 'medium';
  if (percentage >= 15) return 'low';
  return 'very-low';
}

/**
 * 格式化數字（加千分位）
 */
function formatNumber(num: number): string {
  return num.toLocaleString('zh-TW');
}

/**
 * 受眾重疊分析矩陣圖
 *
 * 視覺化呈現受眾間的重疊程度，
 * 高重疊率會以紅色警示標記
 */
export function OverlapChart({
  audiences,
  overlapData,
  loading = false,
  compact = false,
  onCellClick,
}: OverlapChartProps) {
  const [hoveredCell, setHoveredCell] = useState<TooltipData | null>(null);

  // 計算重疊矩陣和高風險配對
  const { matrix, highRiskPairs } = useMemo(() => {
    if (audiences.length === 0) {
      return { matrix: [], highRiskPairs: [] };
    }

    const n = audiences.length;
    const matrixData: {
      audience1: AudienceBase;
      audience2: AudienceBase;
      percentage: number;
      overlapCount: number;
      status: OverlapStatus;
    }[][] = [];

    const pairs: AudienceOverlapPair[] = [];

    for (let i = 0; i < n; i++) {
      matrixData[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrixData[i][j] = {
            audience1: audiences[i],
            audience2: audiences[j],
            percentage: 100,
            overlapCount: audiences[i].size,
            status: 'high',
          };
        } else {
          const key = `${audiences[i].id}-${audiences[j].id}`;
          const overlapCount = overlapData[key] || 0;
          const percentage = calculateOverlapPercentage(
            audiences[i].size,
            audiences[j].size,
            overlapCount
          );
          const status = getOverlapStatus(percentage);

          matrixData[i][j] = {
            audience1: audiences[i],
            audience2: audiences[j],
            percentage,
            overlapCount,
            status,
          };

          // 只記錄上三角矩陣的配對（避免重複）
          if (i < j) {
            pairs.push({
              audience1: audiences[i],
              audience2: audiences[j],
              overlapCount,
              overlapPercentage: percentage,
              status,
            });
          }
        }
      }
    }

    // 篩選高風險配對（>30%）並排序
    const highRisk = sortOverlapPairsByRisk(
      pairs.filter((p) => p.status === 'high')
    );

    return { matrix: matrixData, highRiskPairs: highRisk };
  }, [audiences, overlapData]);

  // 載入中狀態
  if (loading) {
    return (
      <div
        data-testid="overlap-chart-loading"
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 空狀態
  if (audiences.length === 0) {
    return (
      <div
        data-testid="overlap-chart"
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center"
      >
        <Info className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          沒有可分析的受眾。請先連結廣告帳戶並同步資料。
        </p>
      </div>
    );
  }

  // 處理儲存格點擊
  const handleCellClick = (
    data: typeof matrix[0][0],
    i: number,
    j: number
  ) => {
    if (i === j) return; // 不處理對角線點擊
    if (onCellClick) {
      onCellClick({
        audience1: data.audience1,
        audience2: data.audience2,
        overlapCount: data.overlapCount,
        overlapPercentage: data.percentage,
        status: data.status,
      });
    }
  };

  return (
    <div
      data-testid="overlap-chart"
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${
        compact ? 'compact' : ''
      }`}
    >
      {/* 標題 */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        受眾重疊分析
      </h3>

      {/* 矩陣圖 */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* 欄標題 */}
          <div className="flex">
            <div className="w-32 shrink-0" /> {/* 空白角落 */}
            {audiences.map((audience) => (
              <div
                key={`header-${audience.id}`}
                className="w-20 shrink-0 text-center"
              >
                <span
                  className={`text-xs text-gray-600 dark:text-gray-300 ${
                    compact ? 'truncate block' : ''
                  }`}
                  title={audience.name}
                >
                  {compact && audience.name.length > 10
                    ? `${audience.name.slice(0, 10)}...`
                    : audience.name}
                </span>
              </div>
            ))}
          </div>

          {/* 矩陣列 */}
          {matrix.map((row, i) => (
            <div key={audiences[i].id} className="flex items-center mt-1">
              {/* 列標題 */}
              <div className="w-32 shrink-0 pr-2">
                <span
                  className={`text-xs text-gray-600 dark:text-gray-300 ${
                    compact ? 'truncate block' : ''
                  }`}
                  title={audiences[i].name}
                >
                  {audiences[i].name}
                </span>
              </div>

              {/* 儲存格 */}
              {row.map((cell, j) => {
                const isHighRisk = cell.status === 'high' && i !== j;
                const isModerate = cell.status === 'moderate' && i !== j;
                const isDiagonal = i === j;

                return (
                  <div
                    key={`${audiences[i].id}-${audiences[j].id}`}
                    data-testid={`overlap-cell-${audiences[i].id}-${audiences[j].id}`}
                    data-intensity={getIntensityLevel(cell.percentage)}
                    className={`
                      w-20 h-12 shrink-0 flex items-center justify-center rounded cursor-pointer
                      transition-all duration-200 relative
                      ${isDiagonal ? 'bg-gray-200 dark:bg-gray-600' : ''}
                      ${isHighRisk ? 'bg-red-100 dark:bg-red-900/30 overlap-high' : ''}
                      ${isModerate ? 'bg-yellow-100 dark:bg-yellow-900/30 overlap-moderate' : ''}
                      ${!isDiagonal && !isHighRisk && !isModerate ? 'bg-green-50 dark:bg-green-900/20 overlap-low' : ''}
                      hover:ring-2 hover:ring-blue-400
                    `}
                    onMouseEnter={() => setHoveredCell({
                      audience1: cell.audience1,
                      audience2: cell.audience2,
                      overlapCount: cell.overlapCount,
                      percentage: cell.percentage,
                      status: cell.status,
                    })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(cell, i, j)}
                  >
                    <span
                      className={`text-sm font-medium ${
                        isHighRisk
                          ? 'text-red-700 dark:text-red-300'
                          : isModerate
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {cell.percentage}%
                    </span>
                    {isHighRisk && (
                      <AlertTriangle
                        data-testid="warning-icon"
                        className="absolute top-1 right-1 w-3 h-3 text-red-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          data-testid="overlap-tooltip"
          className="fixed z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm"
          style={{
            left: '50%',
            bottom: '20px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-sm font-medium mb-2">
            {hoveredCell.audience1.name} ↔ {hoveredCell.audience2.name}
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            <div>重疊率: {hoveredCell.percentage}%</div>
            <div>重疊人數: {formatNumber(hoveredCell.overlapCount)}</div>
            {hoveredCell.status === 'high' && (
              <div className="mt-2 text-yellow-300">
                💡 {getOverlapSuggestion(hoveredCell.percentage).message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 色彩圖例 */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-50 dark:bg-green-900/20 rounded" />
          <span>&lt;20% 正常</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded" />
          <span>20-30% 需監控</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded" />
          <span>&gt;30% 需處理</span>
        </div>
      </div>

      {/* 高風險配對列表 */}
      <div data-testid="high-risk-pairs" className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          高風險重疊配對
        </h4>
        {highRiskPairs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            🎉 沒有高風險的重疊配對，受眾設定良好！
          </p>
        ) : (
          <div className="space-y-2">
            {highRiskPairs.map((pair, index) => (
              <div
                key={`${pair.audience1.id}-${pair.audience2.id}`}
                data-testid={`risk-pair-${index}`}
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {pair.audience1.name} ↔ {pair.audience2.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {pair.overlapPercentage}%
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({formatNumber(pair.overlapCount)} 人)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
