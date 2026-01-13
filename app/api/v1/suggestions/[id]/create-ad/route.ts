import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/v1/suggestions/[id]/create-ad
 *
 * 根據建議建立完整廣告（Ad Set + Ad）（代理到 Python 後端）
 *
 * 需要 Agency 或以上訂閱方案。
 *
 * Query Parameters:
 * - user_id: 用戶 ID（必填）
 *
 * Request Body:
 * - campaign_id: 廣告活動 ID（必填）
 * - daily_budget: 每日預算（必填）
 * - ad_name: 廣告名稱（選填）
 * - use_suggested_copy: 是否使用 AI 建議文案（選填，預設 true）
 * - custom_ad_copy: 自訂廣告文案（選填）
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
    const body = await request.json();

    // 驗證請求體
    if (!body.campaign_id || !body.daily_budget) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'campaign_id and daily_budget are required',
          },
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/suggestions/${id}/create-ad?${searchParams.toString()}`,
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
              message: errorData.detail || '升級至 Agency 方案以使用此功能',
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
    console.error('[Suggestions] Create ad error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create ad',
        },
      },
      { status: 500 }
    );
  }
}
