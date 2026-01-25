import { NextRequest, NextResponse } from 'next/server';

// Python 後端 URL
const PYTHON_API = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * POST /api/v1/history/revert
 *
 * 還原操作
 * Body: { id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: '缺少歷史記錄 ID' } },
        { status: 400 }
      );
    }

    // 呼叫 Python 後端
    const response = await fetch(`${PYTHON_API}/api/v1/history/${id}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          reverted: data.reverted,
          reverted_at: data.reverted_at,
        },
      });
    }

    // 處理後端錯誤
    const errorData = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: { code: 'BACKEND_ERROR', message: errorData.detail || '還原操作失敗' } },
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
