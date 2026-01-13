import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/suggestions/[id]
 *
 * 取得智慧建議詳情（代理到 Python 後端）
 *
 * Query Parameters:
 * - user_id: 用戶 ID（必填）
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
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
      `${PYTHON_API_URL}/api/v1/suggestions/${id}?${searchParams.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Suggestion not found',
            },
          },
          { status: 404 }
        );
      }

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
    console.error('[Suggestions] Detail fetch error:', error);
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
