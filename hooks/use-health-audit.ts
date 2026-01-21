'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HealthAudit, AuditIssue } from '@/lib/api/types';

/**
 * useHealthAudit Hook 回傳型別
 */
interface UseHealthAuditReturn {
  audit: HealthAudit | null;
  issues: AuditIssue[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  triggerAudit: () => Promise<void>;
  resolveIssue: (issueId: string) => Promise<void>;
  ignoreIssue: (issueId: string) => Promise<void>;
}

/**
 * 健檢資料與問題清單 Hook
 *
 * 提供帳戶健檢數據、問題清單和操作功能
 *
 * @param accountId - 廣告帳戶 ID（可選）
 *
 * @example
 * ```tsx
 * const { audit, issues, isLoading, triggerAudit, resolveIssue } = useHealthAudit();
 *
 * if (isLoading) return <Loading />;
 * return <HealthReport audit={audit} issues={issues} />;
 * ```
 */
export function useHealthAudit(accountId?: string): UseHealthAuditReturn {
  const [audit, setAudit] = useState<HealthAudit | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async () => {
    // SSR 保護：確保只在瀏覽器環境執行
    if (typeof window === 'undefined') return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await fetch(`/api/v1/health/audit?${params}`);

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      // 後端返回 { data: { id, overall_score, ..., issues: [...] } }
      // 其中 issues 直接包含在 data 中
      const result = await response.json();
      const auditData = result.data;

      // 提取 audit 資訊（不含 issues）
      const { issues: issuesList, ...auditInfo } = auditData;
      setAudit(auditInfo as HealthAudit);
      setIssues(issuesList || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  /**
   * 觸發新的健檢
   */
  const triggerAudit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/health/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });

      if (!response.ok) {
        throw new Error(`觸發健檢失敗: ${response.status}`);
      }

      // 重新獲取數據
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('觸發健檢失敗'));
      setIsLoading(false);
    }
  }, [accountId, fetchData]);

  /**
   * 標記問題為已解決
   */
  const resolveIssue = useCallback(async (issueId: string) => {
    try {
      const response = await fetch(`/api/v1/health/issues/${issueId}/resolve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`操作失敗: ${response.status}`);
      }

      // 更新本地狀態
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, status: 'resolved' } : issue
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('操作失敗'));
    }
  }, []);

  /**
   * 忽略問題
   */
  const ignoreIssue = useCallback(async (issueId: string) => {
    try {
      const response = await fetch(`/api/v1/health/issues/${issueId}/ignore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`操作失敗: ${response.status}`);
      }

      // 更新本地狀態
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, status: 'ignored' } : issue
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('操作失敗'));
    }
  }, []);

  // 確保組件已掛載（客戶端渲染完成）
  useEffect(() => {
    setMounted(true);
  }, []);

  // 只在掛載後才執行 fetchData
  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, fetchData]);

  return {
    audit,
    issues,
    // 未掛載時也顯示 loading 狀態，避免 hydration mismatch
    isLoading: !mounted || isLoading,
    error,
    refetch: fetchData,
    triggerAudit,
    resolveIssue,
    ignoreIssue,
  };
}
