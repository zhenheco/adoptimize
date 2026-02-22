import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/health/audit
 *
 * 取得最新的健檢報告（代理到 Python 後端）
 *
 * Query Parameters:
 * - account_id: 帳戶 ID（可選）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const authHeader = request.headers.get('Authorization');

  try {
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/health/audit?${searchParams.toString()}`,
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
    console.error('[Health Audit] Backend connection error:', error);
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

/**
 * POST /api/v1/health/audit
 *
 * 觸發新的健檢（代理到 Python 後端）
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('Authorization');

  try {
    const body = await request.json();

    const response = await fetch(`${PYTHON_API_URL}/api/v1/health/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

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
    console.error('[Health Audit POST] Backend connection error:', error);
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
