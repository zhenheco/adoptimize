/**
 * useHealthAudit Hook 單元測試
 *
 * 測試健檢數據獲取、問題管理和審計觸發邏輯
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useHealthAudit } from '../use-health-audit';
import type { HealthAudit, AuditIssue, ApiResponse } from '@/lib/api/types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// 測試用 Mock 數據
const mockAudit: HealthAudit = {
  id: 'audit-1',
  account_id: 'account-1',
  overall_score: 72,
  dimensions: {
    structure: { score: 85, weight: 0.2, issues: 2 },
    creative: { score: 60, weight: 0.25, issues: 5 },
    audience: { score: 75, weight: 0.25, issues: 3 },
    budget: { score: 80, weight: 0.2, issues: 1 },
    tracking: { score: 65, weight: 0.1, issues: 2 },
  },
  grade: 'good',
  issues_count: 13,
  created_at: '2024-12-07T10:30:00Z',
};

const mockIssues: AuditIssue[] = [
  {
    id: 'issue-1',
    category: 'CREATIVE',
    severity: 'HIGH',
    issue_code: 'CREATIVE_FATIGUE',
    title: '素材疲勞嚴重',
    description: '3 個素材已超過疲勞警示門檻',
    impact_description: '可能導致 CTR 持續下降',
    solution: '更換或暫停疲勞素材',
    affected_entities: ['creative-1', 'creative-2', 'creative-3'],
    status: 'open',
  },
  {
    id: 'issue-2',
    category: 'AUDIENCE',
    severity: 'MEDIUM',
    issue_code: 'AUDIENCE_OVERLAP',
    title: '受眾重疊過高',
    description: '2 組受眾重疊率超過 30%',
    impact_description: '可能導致自我競標',
    solution: '考慮排除重疊受眾',
    affected_entities: ['audience-1', 'audience-2'],
    status: 'open',
  },
  {
    id: 'issue-3',
    category: 'TRACKING',
    severity: 'LOW',
    issue_code: 'UTM_MISSING',
    title: 'UTM 參數缺失',
    description: '5 則廣告未設置 UTM 參數',
    impact_description: '無法追蹤流量來源',
    solution: '為廣告添加 UTM 參數',
    affected_entities: ['ad-1', 'ad-2', 'ad-3', 'ad-4', 'ad-5'],
    status: 'resolved',
  },
];

const mockApiResponse: ApiResponse<{ audit: HealthAudit; issues: AuditIssue[] }> = {
  data: { audit: mockAudit, issues: mockIssues },
};

describe('useHealthAudit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初始狀態', () => {
    it('應該在初始狀態時設置 isLoading 為 true', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const { result } = renderHook(() => useHealthAudit());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.audit).toBeNull();
      expect(result.current.issues).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('成功獲取數據', () => {
    it('應該成功獲取審計數據和問題清單', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.audit).toEqual(mockAudit);
      expect(result.current.issues).toEqual(mockIssues);
      expect(result.current.error).toBeNull();
    });

    it('應該使用正確的 API URL（無帳戶 ID）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/health/audit?');
      });
    });

    it('應該使用正確的 API URL（含帳戶 ID）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      renderHook(() => useHealthAudit('account-123'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/health/audit?account_id=account-123');
      });
    });
  });

  describe('錯誤處理', () => {
    it('應該處理 API 錯誤回應', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('API 請求失敗: 500');
    });

    it('應該處理網路錯誤', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('triggerAudit 功能', () => {
    it('應該觸發新的健檢', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              audit: { ...mockAudit, overall_score: 80 },
              issues: mockIssues.filter((i) => i.status !== 'resolved'),
            },
          }),
        });

      const { result } = renderHook(() => useHealthAudit('account-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerAudit();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/health/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: 'account-123' }),
      });
    });

    it('應該處理 triggerAudit 錯誤', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
        });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerAudit();
      });

      expect(result.current.error?.message).toContain('觸發健檢失敗');
    });
  });

  describe('resolveIssue 功能', () => {
    it('應該標記問題為已解決', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.issues.length).toBeGreaterThan(0);
      });

      const openIssue = result.current.issues.find((i) => i.status === 'open');
      expect(openIssue).toBeDefined();

      await act(async () => {
        await result.current.resolveIssue(openIssue!.id);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/health/issues/${openIssue!.id}/resolve`,
        { method: 'POST' }
      );

      const updatedIssue = result.current.issues.find((i) => i.id === openIssue!.id);
      expect(updatedIssue?.status).toBe('resolved');
    });

    it('應該處理 resolveIssue 錯誤', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.issues.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.resolveIssue('issue-1');
      });

      expect(result.current.error?.message).toContain('操作失敗');
    });
  });

  describe('ignoreIssue 功能', () => {
    it('應該忽略問題', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.issues.length).toBeGreaterThan(0);
      });

      const openIssue = result.current.issues.find((i) => i.status === 'open');
      expect(openIssue).toBeDefined();

      await act(async () => {
        await result.current.ignoreIssue(openIssue!.id);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/health/issues/${openIssue!.id}/ignore`,
        { method: 'POST' }
      );

      const updatedIssue = result.current.issues.find((i) => i.id === openIssue!.id);
      expect(updatedIssue?.status).toBe('ignored');
    });

    it('應該處理 ignoreIssue 錯誤', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.issues.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.ignoreIssue('issue-1');
      });

      expect(result.current.error?.message).toContain('操作失敗');
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
            data: {
              audit: { ...mockAudit, overall_score: 85 },
              issues: [],
            },
          }),
        });

      const { result } = renderHook(() => useHealthAudit());

      await waitFor(() => {
        expect(result.current.audit?.overall_score).toBe(72);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.audit?.overall_score).toBe(85);
      expect(result.current.issues).toEqual([]);
    });
  });

  describe('帳戶 ID 變更', () => {
    it('應該在帳戶 ID 變更時重新獲取數據', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const { rerender } = renderHook(
        ({ accountId }) => useHealthAudit(accountId),
        { initialProps: { accountId: 'account-1' } }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/health/audit?account_id=account-1');
      });

      rerender({ accountId: 'account-2' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/health/audit?account_id=account-2');
      });
    });
  });
});
