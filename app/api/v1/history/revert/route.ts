import { NextRequest, NextResponse } from 'next/server';

// Python 後端 URL
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

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

    // 嘗試呼叫 Python 後端
    try {
      const response = await fetch(`${PYTHON_API}/api/v1/history/${id}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // Python 後端不可用，使用模擬回應
    }

    // 模擬處理時間
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(`Reverting action history: ${id}`);

    return NextResponse.json({
      success: true,
      data: {
        id,
        reverted: true,
        reverted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('History Revert API Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '還原操作失敗' } },
      { status: 500 }
    );
  }
}
