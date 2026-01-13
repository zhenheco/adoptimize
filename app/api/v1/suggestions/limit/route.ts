import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/suggestions/limit
 *
 * 檢查智慧建議使用限制（代理到 Python 後端）
 *
 * Query Parameters:
 * - user_id: 用戶 ID（必填）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;

  // 驗證必填參數
  const userId = searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_PARAM',
          message: 'user_id is required',
        },
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/suggestions/limit?${searchParams.toString()}`,
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
    console.error('[Suggestions] Limit check error:', error);
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
