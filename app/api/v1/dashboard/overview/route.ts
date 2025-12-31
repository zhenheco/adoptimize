import { NextRequest, NextResponse } from 'next/server';
import type { DashboardOverview, MetricStatus, ApiResponse } from '@/lib/api/types';

/**
 * 判斷指標狀態
 *
 * 根據變化率判斷指標是正常、警示還是異常
 * @param change 變化率（%）
 * @param invert 是否反轉判斷（如 CPA 越低越好）
 */
function getMetricStatus(change: number, invert = false): MetricStatus {
  const adjustedChange = invert ? -change : change;

  if (adjustedChange > -10) return 'normal';
  if (adjustedChange > -30) return 'warning';
  return 'danger';
}

/**
 * 計算時間範圍
 *
 * 根據 period 參數計算起始和結束日期
 */
function calculateDateRange(period: string): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'today':
      // 今天
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    default:
      // 預設 7 天
      start.setDate(start.getDate() - 7);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * GET /api/v1/dashboard/overview
 *
 * 取得儀表板總覽數據
 *
 * Query Parameters:
 * - period: 時間週期（today, 7d, 30d, custom）
 * - account_ids: 帳戶 ID（逗號分隔，可選）
 *
 * Returns:
 * - DashboardOverview 結構的 JSON
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '7d';
  // const accountIds = searchParams.get('account_ids')?.split(',');

  // 計算日期範圍
  const dateRange = calculateDateRange(period);

  // TODO: 連接到 Python 後端 API 取得實際數據
  // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
  // const response = await fetch(`${pythonApiUrl}/api/v1/dashboard/overview?period=${period}`);

  // 目前回傳模擬數據
  const mockData: DashboardOverview = {
    period: dateRange,
    metrics: {
      spend: { value: 1500.0, change: -5.2, status: getMetricStatus(-5.2) },
      impressions: { value: 50000, change: 12.3, status: getMetricStatus(12.3) },
      clicks: { value: 2500, change: 8.1, status: getMetricStatus(8.1) },
      conversions: { value: 125, change: -2.5, status: getMetricStatus(-2.5) },
      cpa: { value: 12.0, change: 15.3, status: getMetricStatus(15.3, true) },
      roas: { value: 3.5, change: -8.2, status: getMetricStatus(-8.2) },
    },
    platforms: {
      google: { spend: 800.0, conversions: 70 },
      meta: { spend: 700.0, conversions: 55 },
    },
  };

  const response: ApiResponse<DashboardOverview> = {
    data: mockData,
    meta: {
      period: dateRange,
    },
  };

  return NextResponse.json(response);
}
