import { NextRequest, NextResponse } from 'next/server';

// Python 後端 URL
const PYTHON_API = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * POST /api/v1/recommendations/:id/ignore
 * 忽略建議
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 呼叫 Python 後端 API
    const response = await fetch(`${PYTHON_API}/api/v1/recommendations/${id}/ignore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: {
          id: data.recommendation_id,
          status: data.new_status,
          ignored_at: new Date().toISOString(),
        },
      });
    }

    // 處理後端錯誤
    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: { code: 'BACKEND_ERROR', message: errorData.detail || '忽略失敗' } },
      { status: response.status }
    );
  } catch {
    // 後端不可用時的 fallback
    return NextResponse.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: '服務暫時無法使用' } },
      { status: 503 }
    );
  }
}
