import { NextRequest, NextResponse } from 'next/server';
import type { DashboardOverview, ApiResponse } from '@/lib/api/types';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/dashboard/overview
 *
 * 取得儀表板總覽數據（代理到 Python 後端）
 *
 * Query Parameters:
 * - period: 時間週期（today, 7d, 30d, custom）
 * - account_ids: 帳戶 ID（逗號分隔，可選）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  try {
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/dashboard/overview?${searchParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: {
            code: 'BACKEND_ERROR',
            message: errorData.detail || `Backend error: ${response.status}`,
          },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Dashboard Overview] Backend connection error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'CONNECTION_ERROR',
          message: 'Unable to connect to backend service',
        },
      },
      { status: 503 }
    );
  }
}
