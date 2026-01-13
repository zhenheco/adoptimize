'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Notification,
  NotificationType,
  NotificationSeverity,
  ApiResponse,
} from '@/lib/api/types';

/**
 * 通知篩選選項
 */
export interface NotificationFilters {
  /** 是否已讀 */
  is_read?: boolean;
  /** 類型篩選 */
  type?: NotificationType;
  /** 嚴重度篩選 */
  severity?: NotificationSeverity;
}

/**
 * useNotifications Hook 回傳型別
 */
interface UseNotificationsReturn {
  notifications: Notification[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  unreadCount: number;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

/**
 * 取得通知列表
 *
 * @param filters - 篩選選項
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, markAsRead } = useNotifications({
 *   is_read: false,
 * });
 * ```
 */
export function useNotifications(
  filters: NotificationFilters = {}
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // 穩定化 filters 依賴
  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const parsedFilters = JSON.parse(filtersKey) as NotificationFilters;

      if (parsedFilters.is_read !== undefined) {
        params.append('is_read', String(parsedFilters.is_read));
      }
      if (parsedFilters.type) {
        params.append('type', parsedFilters.type);
      }
      if (parsedFilters.severity) {
        params.append('severity', parsedFilters.severity);
      }

      const response = await fetch(`/api/v1/notifications?${params}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result: ApiResponse<Notification[]> = await response.json();
      setNotifications(result.data);
      setTotal(result.meta?.total || 0);
      setUnreadCount(result.meta?.unread_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey]);

  /**
   * 標記單一通知為已讀
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error(`標記已讀失敗: ${response.status}`);
      }

      // 更新本地狀態
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('標記已讀失敗'));
      throw err;
    }
  }, []);

  /**
   * 標記所有通知為已讀
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/notifications/read-all', {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error(`標記全部已讀失敗: ${response.status}`);
      }

      // 更新本地狀態
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: now }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('標記全部已讀失敗'));
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    notifications,
    isLoading,
    error,
    total,
    unreadCount,
    refetch: fetchData,
    markAsRead,
    markAllAsRead,
  };
}
