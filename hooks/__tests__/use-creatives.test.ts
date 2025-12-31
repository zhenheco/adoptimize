/**
 * useCreatives Hook 單元測試
 *
 * 測試素材列表獲取、篩選、分頁和狀態切換邏輯
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCreatives } from '../use-creatives';
import type { Creative, ApiResponse } from '@/lib/api/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// 測試用 Mock 數據
const mockCreatives: Creative[] = [
  {
    id: 'creative-1',
    name: 'Summer Sale Banner',
    type: 'IMAGE',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    metrics: {
      impressions: 10000,
      clicks: 500,
      ctr: 0.05,
      conversions: 25,
      spend: 150,
    },
    fatigue: {
      score: 35,
      status: 'healthy',
      ctr_change: -5,
      frequency: 2.1,
      days_active: 10,
    },
    status: 'active',
  },
  {
    id: 'creative-2',
    name: 'Winter Collection Video',
    type: 'VIDEO',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    metrics: {
      impressions: 8000,
      clicks: 320,
      ctr: 0.04,
      conversions: 16,
      spend: 120,
    },
    fatigue: {
      score: 65,
      status: 'warning',
      ctr_change: -15,
      frequency: 3.5,
      days_active: 21,
    },
    status: 'active',
  },
  {
    id: 'creative-3',
    name: 'Old Promo Carousel',
    type: 'CAROUSEL',
    thumbnail_url: 'https://example.com/thumb3.jpg',
    metrics: {
      impressions: 5000,
      clicks: 100,
      ctr: 0.02,
      conversions: 5,
      spend: 80,
    },
    fatigue: {
      score: 82,
      status: 'fatigued',
      ctr_change: -25,
      frequency: 5.2,
      days_active: 45,
    },
    status: 'paused',
  },
];

const createMockResponse = (
  creatives: Creative[],
  page = 1,
  total = creatives.length
): ApiResponse<Creative[]> => ({
  data: creatives,
  meta: { page, total },
});

describe('useCreatives', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始狀態', () => {
    it('應該在初始狀態時設置 isLoading 為 true', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useCreatives());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.creatives).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('應該初始化預設分頁', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useCreatives());

      expect(result.current.pagination).toEqual({
        page: 1,
        pageSize: 12,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('成功獲取數據', () => {
    it('應該成功獲取素材列表', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockCreatives, 1, 3),
      });

      const { result } = renderHook(() => useCreatives());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.creatives).toEqual(mockCreatives);
      expect(result.current.error).toBeNull();
    });

    it('應該正確計算分頁資訊', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockCreatives.slice(0, 2), 1, 25),
      });

      const { result } = renderHook(() => useCreatives({}, 1, 12));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pagination).toEqual({
        page: 1,
        pageSize: 12,
        total: 25,
        totalPages: 3, // Math.ceil(25/12) = 3
      });
    });
  });

  describe('篩選參數', () => {
    it('應該正確構建 URL 參數（無篩選）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockCreatives),
      });

      renderHook(() => useCreatives());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/creatives?page=1&pageSize=12');
      });
    });

    it('應該正確構建 URL 參數（含類型篩選）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse([mockCreatives[0]]),
      });

      renderHook(() => useCreatives({ type: 'IMAGE' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('type=IMAGE'));
      });
    });

    it('應該正確構建 URL 參數（含疲勞狀態篩選）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse([mockCreatives[1]]),
      });

      renderHook(() => useCreatives({ fatigueStatus: 'warning' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('fatigue_status=warning'));
      });
    });

    it('應該忽略 "all" 類型的篩選值', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockCreatives),
      });

      renderHook(() => useCreatives({ type: 'all', fatigueStatus: 'all', status: 'all' }));

      await waitFor(() => {
        const call = mockFetch.mock.calls[0][0] as string;
        expect(call).not.toContain('type=');
        expect(call).not.toContain('fatigue_status=');
        expect(call).not.toContain('status=');
      });
    });

    it('應該正確構建排序參數', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockCreatives),
      });

      renderHook(() => useCreatives({ sortBy: 'fatigue', sortOrder: 'desc' }));

      await waitFor(() => {
        const call = mockFetch.mock.calls[0][0] as string;
        expect(call).toContain('sort_by=fatigue');
        expect(call).toContain('sort_order=desc');
      });
    });
  });

  describe('分頁', () => {
    it('應該支援自訂頁碼', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockCreatives, 2, 25),
      });

      renderHook(() => useCreatives({}, 2, 12));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      });
    });

    it('應該支援自訂每頁筆數', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockCreatives, 1, 25),
      });

      renderHook(() => useCreatives({}, 1, 24));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('pageSize=24'));
      });
    });
  });

  describe('錯誤處理', () => {
    it('應該處理 API 錯誤回應', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useCreatives());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('API 請求失敗: 404');
    });

    it('應該處理網路錯誤', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useCreatives());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network failure');
    });
  });

  describe('toggleStatus 功能', () => {
    it('應該將 active 素材切換為 paused', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockCreatives),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useCreatives());

      await waitFor(() => {
        expect(result.current.creatives.length).toBeGreaterThan(0);
      });

      const activeCreative = result.current.creatives.find(c => c.status === 'active');
      expect(activeCreative).toBeDefined();

      await act(async () => {
        await result.current.toggleStatus(activeCreative!);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/creatives/${activeCreative!.id}/pause`,
        { method: 'POST' }
      );

      // 驗證本地狀態更新
      const updatedCreative = result.current.creatives.find(c => c.id === activeCreative!.id);
      expect(updatedCreative?.status).toBe('paused');
    });

    it('應該將 paused 素材切換為 active', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockCreatives),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useCreatives());

      await waitFor(() => {
        expect(result.current.creatives.length).toBeGreaterThan(0);
      });

      const pausedCreative = result.current.creatives.find(c => c.status === 'paused');
      expect(pausedCreative).toBeDefined();

      await act(async () => {
        await result.current.toggleStatus(pausedCreative!);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/creatives/${pausedCreative!.id}/enable`,
        { method: 'POST' }
      );

      const updatedCreative = result.current.creatives.find(c => c.id === pausedCreative!.id);
      expect(updatedCreative?.status).toBe('active');
    });

    it('應該處理 toggleStatus 錯誤', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockCreatives),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useCreatives());

      await waitFor(() => {
        expect(result.current.creatives.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.toggleStatus(mockCreatives[0]);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('操作失敗');
    });
  });

  describe('refetch 功能', () => {
    it('應該提供 refetch 函數重新獲取數據', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockCreatives),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse([...mockCreatives, { ...mockCreatives[0], id: 'new-creative' }], 1, 4),
        });

      const { result } = renderHook(() => useCreatives());

      await waitFor(() => {
        expect(result.current.creatives.length).toBe(3);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.creatives.length).toBe(4);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
