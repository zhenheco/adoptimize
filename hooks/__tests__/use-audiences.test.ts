/**
 * useAudiences Hook 單元測試
 *
 * 測試受眾列表獲取、篩選和分頁邏輯
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAudiences } from '../use-audiences';
import type { Audience, ApiResponse } from '@/lib/api/types';

// Mock fetch - 使用模組級別的 mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// 測試用 Mock 數據
const mockAudiences: Audience[] = [
  {
    id: 'audience-1',
    name: 'Website Visitors',
    type: 'CUSTOM',
    size: 50000,
    source: 'WEBSITE',
    metrics: {
      reach: 45000,
      impressions: 120000,
      conversions: 250,
      spend: 1500,
      cpa: 6,
      roas: 4.2,
    },
    health_score: 85,
  },
  {
    id: 'audience-2',
    name: 'Lookalike 1%',
    type: 'LOOKALIKE',
    size: 500000,
    source: 'LOOKALIKE',
    metrics: {
      reach: 420000,
      impressions: 980000,
      conversions: 180,
      spend: 2800,
      cpa: 15.56,
      roas: 2.1,
    },
    health_score: 62,
  },
];

const createMockResponse = (
  audiences: Audience[],
  page = 1,
  total = audiences.length
): ApiResponse<Audience[]> => ({
  data: audiences,
  meta: { page, total },
});

describe('useAudiences', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始狀態', () => {
    it('應該在初始狀態時設置 isLoading 為 true', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAudiences());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.audiences).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('成功獲取數據', () => {
    it('應該成功獲取受眾列表', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockAudiences, 1, 2),
      });

      const { result } = renderHook(() => useAudiences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.audiences).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });

    it('應該正確計算分頁資訊', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockAudiences, 1, 35),
      });

      const { result } = renderHook(() => useAudiences({}, 1, 10));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pagination.total).toBe(35);
      expect(result.current.pagination.totalPages).toBe(4);
    });
  });

  describe('篩選參數', () => {
    it('應該正確構建 URL 參數（無篩選）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockAudiences),
      });

      renderHook(() => useAudiences());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/audiences?page=1&pageSize=10'
        );
      });
    });

    it('應該正確構建 URL 參數（含類型篩選）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse([mockAudiences[0]]),
      });

      renderHook(() => useAudiences({ type: 'CUSTOM' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('type=CUSTOM')
        );
      });
    });

    it('應該正確構建排序參數', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockAudiences),
      });

      renderHook(() => useAudiences({ sortBy: 'cpa', sortOrder: 'asc' }));

      await waitFor(() => {
        const call = mockFetch.mock.calls[0][0] as string;
        expect(call).toContain('sort_by=cpa');
        expect(call).toContain('sort_order=asc');
      });
    });
  });

  describe('錯誤處理', () => {
    it('應該處理 API 錯誤回應', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useAudiences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('API 請求失敗');
    });

    it('應該處理網路錯誤', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useAudiences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network failure');
    });
  });

  describe('refetch 功能', () => {
    it('應該提供 refetch 函數重新獲取數據', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockAudiences, 1, 2),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockResponse(
              [...mockAudiences, { ...mockAudiences[0], id: 'new-audience' }],
              1,
              3
            ),
        });

      const { result } = renderHook(() => useAudiences());

      await waitFor(() => {
        expect(result.current.audiences.length).toBe(2);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.audiences.length).toBe(3);
    });
  });
});
