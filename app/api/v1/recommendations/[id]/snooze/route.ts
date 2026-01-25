import { NextRequest, NextResponse } from 'next/server';

// Python 後端 URL
const PYTHON_API = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * POST /api/v1/recommendations/:id/snooze
 * 延後處理建議
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { snooze_until } = body;

    if (!snooze_until) {
      return NextResponse.json(
        { error: { code: 'MISSING_SNOOZE_UNTIL', message: '缺少延後時間' } },
        { status: 400 }
      );
    }

    // 呼叫 Python 後端 API
    const response = await fetch(`${PYTHON_API}/api/v1/recommendations/${id}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snooze_until }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: {
          id: data.recommendation_id,
          status: data.new_status,
          snooze_until,
          snoozed_at: new Date().toISOString(),
        },
      });
    }

    // 處理後端錯誤
    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: { code: 'BACKEND_ERROR', message: errorData.detail || '延後操作失敗' } },
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
