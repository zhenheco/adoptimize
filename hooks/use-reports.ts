'use client';

import useSWR from 'swr';
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

const fetcher = async <T>(url: string) => {
  return api.get<T>(url);
};

export function useReports(reportType?: string) {
  const url = reportType
    ? `/reports?report_type=${reportType}`
    : '/reports';

  const { data, error, isLoading, mutate } = useSWR<ReportListItem[]>(
    url,
    fetcher
  );

  return {
    reports: data || [],
    error,
    isLoading,
    mutate,
  };
}

export function useReport(reportId: string) {
  const { data, error, isLoading } = useSWR<ReportDetail>(
    reportId ? `/reports/${reportId}` : null,
    fetcher
  );

  return {
    report: data,
    error,
    isLoading,
  };
}
