'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  PlayCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Pause,
  TrendingDown,
  Users,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type { Recommendation } from '@/lib/api/types';

/**
 * 批次操作類型
 */
export type BatchRecommendationAction = 'execute' | 'ignore';

/**
 * 進度資訊
 */
export interface BatchProgress {
  current: number;
  total: number;
}

/**
 * BatchRecommendationDialog 元件屬性
 */
export interface BatchRecommendationDialogProps {
  /** 對話框是否開啟 */
  open: boolean;
  /** 開關狀態變更回調 */
  onOpenChange: (open: boolean) => void;
  /** 操作類型 */
  action: BatchRecommendationAction;
  /** 選取的建議列表 */
  items: Recommendation[];
  /** 確認按鈕回調 */
  onConfirm: () => void;
  /** 是否載入中 */
  isLoading?: boolean;
  /** 錯誤訊息 */
  error?: string;
  /** 執行進度 */
  progress?: BatchProgress;
}

/**
 * 取得建議類型圖示
 */
function getTypeIcon(type: string) {
  switch (type) {
    case 'PAUSE_CREATIVE':
      return <Pause className="w-4 h-4" />;
    case 'REDUCE_BUDGET':
      return <TrendingDown className="w-4 h-4" />;
    case 'EXCLUDE_AUDIENCE':
      return <Users className="w-4 h-4" />;
    case 'REFRESH_CREATIVE':
      return <RefreshCw className="w-4 h-4" />;
    case 'INCREASE_BUDGET':
      return <TrendingUp className="w-4 h-4" />;
    default:
      return <Settings className="w-4 h-4" />;
  }
}

/**
 * 格式化金額
 */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

/**
 * 批次建議操作確認對話框
 *
 * 在執行批次執行或忽略操作前，顯示確認對話框
 * 列出所有將受影響的建議及總預估影響
 *
 * @example
 * ```tsx
 * <BatchRecommendationDialog
 *   open={isDialogOpen}
 *   onOpenChange={setIsDialogOpen}
 *   action="execute"
 *   items={selectedRecommendations}
 *   onConfirm={handleBatchExecute}
 *   isLoading={isPending}
 *   progress={{ current: 2, total: 5 }}
 * />
 * ```
 */
export function BatchRecommendationDialog({
  open,
  onOpenChange,
  action,
  items,
  onConfirm,
  isLoading = false,
  error,
  progress,
}: BatchRecommendationDialogProps) {
  const isExecute = action === 'execute';
  const title = isExecute ? '確認批次執行' : '確認批次忽略';
  const description = `確定要${isExecute ? '執行' : '忽略'}以下 ${items.length} 個建議嗎？`;
  const confirmText = isExecute ? '執行' : '忽略';
  const confirmButtonVariant = isExecute ? 'default' : 'outline';

  // 計算總預估影響
  const totalImpact = items.reduce((sum, item) => sum + item.estimated_impact, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isExecute ? (
              <PlayCircle className="w-5 h-5 text-blue-500" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-500" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {items.length > 0 ? description : '沒有選取任何建議'}
          </DialogDescription>
        </DialogHeader>

        {/* 建議列表 */}
        {items.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-2 py-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-800"
              >
                {/* 類型圖示 */}
                <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-300">
                  {getTypeIcon(item.type)}
                </div>
                {/* 名稱和影響 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{formatCurrency(item.estimated_impact)}/週</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 總預估影響 */}
        {items.length > 0 && (
          <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              總預估週節省
            </span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalImpact)}
            </span>
          </div>
        )}

        {/* 進度顯示 */}
        {isLoading && progress && (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                處理中... <strong>{progress.current} / {progress.total}</strong>
              </span>
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div
            role="alert"
            className="p-3 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={onConfirm}
            disabled={isLoading || items.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                處理中...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
