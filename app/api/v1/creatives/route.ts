import { NextRequest, NextResponse } from 'next/server';
import type { Creative, ApiResponse } from '@/lib/api/types';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/creatives
 *
 * 取得素材列表（代理到 Python 後端）
 *
 * Query Parameters:
 * - page: 頁碼（預設 1）
 * - pageSize: 每頁筆數（預設 12）
 * - type: 素材類型（IMAGE, VIDEO, CAROUSEL）
 * - fatigue_status: 疲勞狀態（healthy, warning, fatigued）
 * - status: 素材狀態（active, paused）
 * - sort_by: 排序欄位（fatigue, ctr, spend, conversions）
 * - sort_order: 排序方向（asc, desc）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  try {
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/creatives?${searchParams.toString()}`,
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
    console.error('[Creatives] Backend connection error:', error);
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
