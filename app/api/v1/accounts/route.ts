import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/accounts
 *
 * 取得廣告帳戶列表（代理到 Python 後端）
 *
 * Query Parameters:
 * - platform: 平台篩選（google, meta）
 * - status: 狀態篩選（active, paused, removed）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  try {
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts?${searchParams.toString()}`,
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
    console.error('[Accounts] Backend connection error:', error);
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
