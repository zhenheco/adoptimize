import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/suggestions
 *
 * 取得智慧建議歷史列表（代理到 Python 後端）
 *
 * Query Parameters:
 * - user_id: 用戶 ID（必填）
 * - account_id: 帳戶 ID（選填）
 * - status: 狀態篩選（選填）
 * - page: 頁碼
 * - page_size: 每頁筆數
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
      `${PYTHON_API_URL}/api/v1/suggestions?${searchParams.toString()}`,
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
    console.error('[Suggestions] Backend connection error:', error);
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
 * POST /api/v1/suggestions
 *
 * 生成 AI 智慧建議（代理到 Python 後端）
 *
 * Request Body:
 * - account_id: 廣告帳戶 ID
 * - industry_code: 產業代碼
 * - objective_code: 廣告目標代碼
 * - additional_context: 補充說明（選填）
 *
 * Query Parameters:
 * - user_id: 用戶 ID（必填）
 * - use_mock: 是否使用模擬模式（選填）
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
    if (!body.account_id || !body.industry_code || !body.objective_code) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'account_id, industry_code, and objective_code are required',
          },
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/suggestions/generate?${searchParams.toString()}`,
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

      // 處理超過使用限制的錯誤
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: errorData.detail?.message || '本月建議生成次數已達上限',
              details: errorData.detail,
            },
          },
          { status: 429 }
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
    console.error('[Suggestions] Generate error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate suggestion',
        },
      },
      { status: 500 }
    );
  }
}
