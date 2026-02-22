import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/dashboard/trends
 *
 * 取得儀表板趨勢數據（代理到 Python 後端）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const authHeader = request.headers.get('Authorization');

  try {
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/dashboard/trends?${searchParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {}),
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
    console.error('[Dashboard Trends] Backend connection error:', error);
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
