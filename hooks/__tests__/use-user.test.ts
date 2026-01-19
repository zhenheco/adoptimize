/**
 * @vitest-environment jsdom
 *
 * useUser Hook 測試
 *
 * 測試從 localStorage 讀取用戶資訊的功能
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUser } from '../use-user';

// 模擬用戶資料
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
};

describe('useUser', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('初始化', () => {
    it('should return null when no user data in localStorage', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should return user data from localStorage', async () => {
      // 先設置 localStorage
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should return null when localStorage contains invalid JSON', () => {
      localStorage.setItem('user', 'invalid-json');

      const { result } = renderHook(() => useUser());

      expect(result.current.user).toBeNull();
    });
  });

  describe('user properties', () => {
    it('should return user id when user exists', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userId).toBe('user-123');
      });
    });

    it('should return user email when user exists', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.userEmail).toBe('test@example.com');
      });
    });

    it('should return undefined for userId when no user', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.userId).toBeUndefined();
    });

    it('should return undefined for userEmail when no user', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.userEmail).toBeUndefined();
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when user exists', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.isLoggedIn).toBe(true);
      });
    });

    it('should return false when no user', () => {
      const { result } = renderHook(() => useUser());

      expect(result.current.isLoggedIn).toBe(false);
    });
  });

  describe('clearUser', () => {
    it('should clear user from state and localStorage', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useUser());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });
});
