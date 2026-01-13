import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/v1/suggestions/[id]/save-audience
 *
 * 根據建議建立 Meta 自訂受眾（代理到 Python 後端）
 *
 * 需要 Professional 或以上訂閱方案。
 *
 * Query Parameters:
 * - user_id: 用戶 ID（必填）
 *
 * Request Body:
 * - audience_name: 受眾名稱（選填）
 */
export async function POST(
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
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/suggestions/${id}/save-audience?${searchParams.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // 處理權限不足
      if (response.status === 403) {
        return NextResponse.json(
          {
            error: {
              code: 'PERMISSION_DENIED',
              message: errorData.detail || '升級至 Professional 方案以使用此功能',
            },
          },
          { status: 403 }
        );
      }

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
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[Suggestions] Save audience error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save audience',
        },
      },
      { status: 500 }
    );
  }
}
