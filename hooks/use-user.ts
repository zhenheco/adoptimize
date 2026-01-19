'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 用戶資訊介面
 */
export interface User {
  id: string;
  email: string;
  name?: string;
}

/**
 * useUser Hook 回傳型別
 */
export interface UseUserReturn {
  /** 用戶資訊，未登入時為 null */
  user: User | null;
  /** 是否正在載入 */
  isLoading: boolean;
  /** 用戶 ID（便捷屬性） */
  userId: string | undefined;
  /** 用戶 Email（便捷屬性） */
  userEmail: string | undefined;
  /** 是否已登入 */
  isLoggedIn: boolean;
  /** 清除用戶資訊（登出時使用） */
  clearUser: () => void;
}

/**
 * 從 localStorage 讀取用戶資訊
 *
 * @example
 * ```tsx
 * const { user, userId, userEmail, isLoggedIn } = useUser();
 *
 * // 顯示用戶 email
 * {isLoggedIn && <span>{userEmail}</span>}
 * ```
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 首次載入時從 localStorage 讀取用戶資料
  useEffect(() => {
    // SSR 保護
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }
    } catch {
      // JSON 解析失敗時忽略錯誤
      console.warn('Failed to parse user from localStorage');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 清除用戶資訊
   */
  const clearUser = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  }, []);

  return {
    user,
    isLoading,
    userId: user?.id,
    userEmail: user?.email,
    isLoggedIn: user !== null,
    clearUser,
  };
}
