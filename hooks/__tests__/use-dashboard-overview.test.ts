/**
 * useDashboardOverview Hook 單元測試
 *
 * 測試儀表板總覽數據獲取邏輯
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardOverview } from '../use-dashboard-overview';
import type { DashboardOverview, ApiResponse } from '@/lib/api/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// 測試用 Mock 數據
const mockOverviewData: DashboardOverview = {
  period: { start: '2024-12-01', end: '2024-12-07' },
  metrics: {
    spend: { value: 1500, change: -5.2, status: 'normal' },
    impressions: { value: 50000, change: 12.3, status: 'normal' },
    clicks: { value: 2500, change: 8.1, status: 'normal' },
    conversions: { value: 125, change: -2.5, status: 'warning' },
    cpa: { value: 12, change: 15.3, status: 'danger' },
    roas: { value: 3.5, change: -8.2, status: 'normal' },
  },
  platforms: {
    google: { spend: 800, conversions: 70 },
    meta: { spend: 700, conversions: 55 },
  },
};

const mockApiResponse: ApiResponse<DashboardOverview> = {
  data: mockOverviewData,
  meta: { period: { start: '2024-12-01', end: '2024-12-07' } },
};

describe('useDashboardOverview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始狀態', () => {
    it('應該在初始狀態時設置 isLoading 為 true', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      const { result } = renderHook(() => useDashboardOverview('7d'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('成功獲取數據', () => {
    it('應該成功獲取並設置數據', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { result } = renderHook(() => useDashboardOverview('7d'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockOverviewData);
      expect(result.current.error).toBeNull();
    });

    it('應該使用正確的 API URL 和參數', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      renderHook(() => useDashboardOverview('30d'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/dashboard/overview?period=30d');
      });
    });

    it('應該使用預設時間週期 7d', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      renderHook(() => useDashboardOverview());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/dashboard/overview?period=7d');
      });
    });
  });

  describe('錯誤處理', () => {
    it('應該處理 API 錯誤回應', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useDashboardOverview('7d'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('API 請求失敗: 500');
      expect(result.current.data).toBeNull();
    });

    it('應該處理網路錯誤', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDashboardOverview('7d'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.data).toBeNull();
    });

    it('應該處理非 Error 類型的例外', async () => {
      mockFetch.mockRejectedValueOnce('Some string error');

      const { result } = renderHook(() => useDashboardOverview('7d'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('未知錯誤');
    });
  });

  describe('refetch 功能', () => {
    it('應該提供 refetch 函數重新獲取數據', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { ...mockOverviewData, metrics: { ...mockOverviewData.metrics, spend: { value: 2000, change: 10, status: 'normal' as const } } },
          }),
        });

      const { result } = renderHook(() => useDashboardOverview('7d'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.metrics.spend.value).toBe(1500);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data?.metrics.spend.value).toBe(2000);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('refetch 應該重置錯誤狀態', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        });

      const { result } = renderHook(() => useDashboardOverview('7d'));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual(mockOverviewData);
    });
  });

  describe('時間週期變更', () => {
    it('應該在 period 變更時重新獲取數據', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { result, rerender } = renderHook<
        ReturnType<typeof useDashboardOverview>,
        { period: '7d' | '30d' | 'today' | 'custom' }
      >(
        ({ period }) => useDashboardOverview(period),
        { initialProps: { period: '7d' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      rerender({ period: '30d' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith('/api/v1/dashboard/overview?period=30d');
      });
    });
  });
});
