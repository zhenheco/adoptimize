'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

interface ReportSummary {
  spend: number;
  conversions: number;
  revenue: number;
  roas: number;
}

interface ReportListItem {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: ReportSummary;
  created_at: string;
}

interface ReportDetail {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  content: Record<string, unknown>;
  content_text: string | null;
  created_at: string;
}

export function useReports(reportType?: string) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = reportType
        ? `/reports?report_type=${reportType}`
        : '/reports';
      const result = await api.get<ReportListItem[]>(url);
      setReports(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('載入失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    reports,
    error,
    isLoading,
    mutate: fetchData,
  };
}

export function useReport(reportId: string) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!reportId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await api.get<ReportDetail>(`/reports/${reportId}`);
      setReport(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('載入失敗'));
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    report,
    error,
    isLoading,
  };
}
