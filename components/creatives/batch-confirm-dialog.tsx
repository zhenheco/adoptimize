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
import { AlertTriangle, Image, Play, Layers, Loader2 } from 'lucide-react';
import type { Creative } from '@/lib/api/types';

/**
 * 批次操作類型
 */
export type BatchAction = 'pause' | 'enable';

/**
 * BatchConfirmDialog 元件屬性
 */
export interface BatchConfirmDialogProps {
  /** 對話框是否開啟 */
  open: boolean;
  /** 開關狀態變更回調 */
  onOpenChange: (open: boolean) => void;
  /** 操作類型 */
  action: BatchAction;
  /** 選取的素材列表 */
  items: Creative[];
  /** 確認按鈕回調 */
  onConfirm: () => void;
  /** 是否載入中 */
  isLoading?: boolean;
  /** 錯誤訊息 */
  error?: string;
}

/**
 * 取得素材類型圖示
 */
function getTypeIcon(type: Creative['type']) {
  switch (type) {
    case 'VIDEO':
      return <Play className="w-4 h-4" />;
    case 'CAROUSEL':
      return <Layers className="w-4 h-4" />;
    case 'IMAGE':
    default:
      return <Image className="w-4 h-4" />;
  }
}

/**
 * 批次操作確認對話框
 *
 * 在執行批次暫停或啟用操作前，顯示確認對話框
 * 列出所有將受影響的素材
 *
 * @example
 * ```tsx
 * <BatchConfirmDialog
 *   open={isDialogOpen}
 *   onOpenChange={setIsDialogOpen}
 *   action="pause"
 *   items={selectedItems}
 *   onConfirm={handleBatchPause}
 *   isLoading={isPending}
 * />
 * ```
 */
export function BatchConfirmDialog({
  open,
  onOpenChange,
  action,
  items,
  onConfirm,
  isLoading = false,
  error,
}: BatchConfirmDialogProps) {
  const isPause = action === 'pause';
  const title = isPause ? '確認批次暫停' : '確認批次啟用';
  const description = `確定要${isPause ? '暫停' : '啟用'}以下 ${items.length} 個素材嗎？`;
  const confirmText = isPause ? '暫停' : '啟用';
  const confirmButtonVariant = isPause ? 'destructive' : 'default';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPause && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
            {title}
          </DialogTitle>
          <DialogDescription>
            {items.length > 0 ? description : '沒有選取任何素材'}
          </DialogDescription>
        </DialogHeader>

        {/* 素材列表 */}
        {items.length > 0 && (
          <div className="max-h-60 overflow-y-auto space-y-2 py-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded bg-gray-50 dark:bg-gray-800"
              >
                {/* 縮圖 */}
                <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getTypeIcon(item.type)
                  )}
                </div>
                {/* 名稱和類型 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    {getTypeIcon(item.type)}
                    <span>{item.type}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div role="alert" className="p-3 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
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
