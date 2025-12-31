/**
 * useRecommendations Hook 單元測試
 *
 * 測試建議列表獲取、執行和忽略邏輯
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRecommendations } from '../use-recommendations';
import type { Recommendation, ApiResponse } from '@/lib/api/types';

// 測試用 Mock 數據
const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    type: 'PAUSE_CREATIVE',
    priority_score: 185,
    title: '暫停疲勞素材',
    description: '素材「Summer Sale Banner」已達疲勞門檻，建議暫停',
    action_module: 'pause_creative',
    estimated_impact: 120,
    status: 'pending',
  },
  {
    id: 'rec-2',
    type: 'ADJUST_BUDGET',
    priority_score: 145,
    title: '調整預算分配',
    description: '廣告組「High Intent Lookalike」效能較佳，建議增加預算',
    action_module: 'adjust_budget',
    estimated_impact: 350,
    status: 'pending',
  },
  {
    id: 'rec-3',
    type: 'EXCLUDE_AUDIENCE',
    priority_score: 110,
    title: '排除重疊受眾',
    description: '受眾「Website Visitors」與「Lookalike 1%」重疊率 35%',
    action_module: 'exclude_audience',
    estimated_impact: 80,
    status: 'executed',
  },
];

const createMockResponse = (
  recommendations: Recommendation[],
  total = recommendations.length
): ApiResponse<Recommendation[]> => ({
  data: recommendations,
  meta: { total },
});

// Mock fetch - 使用模組級別的 mock，像其他測試文件一樣
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useRecommendations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始狀態', () => {
    it('應該在初始狀態時設置 isLoading 為 true', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useRecommendations());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.recommendations).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.total).toBe(0);
    });
  });

  describe('成功獲取數據', () => {
    it('應該成功獲取建議列表', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockRecommendations, 3),
      });

      const { result } = renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendations).toHaveLength(3);
      expect(result.current.total).toBe(3);
      expect(result.current.error).toBeNull();
    });

    it('應該使用預設篩選條件（pending）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createMockResponse(mockRecommendations.filter((r) => r.status === 'pending')),
      });

      renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=pending')
        );
      });
    });
  });

  describe('篩選參數', () => {
    it('應該正確構建 URL 參數（狀態篩選：executed）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () =>
          createMockResponse(mockRecommendations.filter((r) => r.status === 'executed')),
      });

      renderHook(() => useRecommendations({ status: 'executed' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=executed')
        );
      });
    });

    it('應該忽略 "all" 狀態篩選', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockRecommendations),
      });

      renderHook(() => useRecommendations({ status: 'all' }));

      await waitFor(() => {
        const call = mockFetch.mock.calls[0][0] as string;
        expect(call).not.toContain('status=all');
      });
    });
  });

  describe('錯誤處理', () => {
    it('應該處理 API 錯誤回應', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('API 請求失敗');
    });

    it('應該處理網路錯誤', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('executeRecommendation 功能', () => {
    it('應該成功執行建議', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockRecommendations),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(result.current.recommendations.length).toBeGreaterThan(0);
      });

      const pendingRec = result.current.recommendations.find(
        (r) => r.status === 'pending'
      );
      expect(pendingRec).toBeDefined();

      await act(async () => {
        await result.current.executeRecommendation(pendingRec!);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/recommendations/${pendingRec!.id}/execute`,
        { method: 'POST' }
      );

      const updatedRec = result.current.recommendations.find(
        (r) => r.id === pendingRec!.id
      );
      expect(updatedRec?.status).toBe('executed');
    });

    it('應該處理執行失敗', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockRecommendations),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(result.current.recommendations.length).toBeGreaterThan(0);
      });

      const pendingRec = result.current.recommendations[0];

      await act(async () => {
        try {
          await result.current.executeRecommendation(pendingRec);
        } catch {
          // 預期會拋出錯誤
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('執行失敗');
    });
  });

  describe('ignoreRecommendation 功能', () => {
    it('應該成功忽略建議', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockRecommendations),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(result.current.recommendations.length).toBeGreaterThan(0);
      });

      const pendingRec = result.current.recommendations.find(
        (r) => r.status === 'pending'
      );
      expect(pendingRec).toBeDefined();

      await act(async () => {
        await result.current.ignoreRecommendation(pendingRec!);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/recommendations/${pendingRec!.id}/ignore`,
        { method: 'POST' }
      );

      const updatedRec = result.current.recommendations.find(
        (r) => r.id === pendingRec!.id
      );
      expect(updatedRec?.status).toBe('ignored');
    });
  });

  describe('refetch 功能', () => {
    it('應該提供 refetch 函數重新獲取數據', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockResponse(mockRecommendations, 3),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            createMockResponse(
              [...mockRecommendations, { ...mockRecommendations[0], id: 'new-rec' }],
              4
            ),
        });

      const { result } = renderHook(() => useRecommendations());

      await waitFor(() => {
        expect(result.current.recommendations.length).toBe(3);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.recommendations.length).toBe(4);
      expect(result.current.total).toBe(4);
    });
  });
});
