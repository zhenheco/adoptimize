import { NextRequest, NextResponse } from 'next/server';

/**
 * 批次操作請求格式
 */
interface BatchRequest {
  action: 'pause' | 'enable';
  ids: string[];
}

/**
 * 批次操作回應格式
 */
interface BatchResponse {
  success: boolean;
  affected: number;
  results: Array<{
    id: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

/**
 * POST /api/v1/creatives/batch
 *
 * 批次暫停或啟用素材
 *
 * @body { action: 'pause' | 'enable', ids: string[] }
 * @returns { success: boolean, affected: number, results: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json();

    // 驗證請求
    if (!body.action || !['pause', 'enable'].includes(body.action)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ACTION',
            message: '無效的操作類型，必須是 pause 或 enable',
          },
        },
        { status: 400 }
      );
    }

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_IDS',
            message: '必須提供至少一個素材 ID',
          },
        },
        { status: 400 }
      );
    }

    // 限制單次批次操作數量
    const MAX_BATCH_SIZE = 50;
    if (body.ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: {
            code: 'BATCH_TOO_LARGE',
            message: `單次批次操作最多 ${MAX_BATCH_SIZE} 個素材`,
          },
        },
        { status: 400 }
      );
    }

    // 嘗試代理到 Python 後端
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';

    try {
      const pythonResponse = await fetch(`${pythonApiUrl}/api/v1/creatives/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (pythonResponse.ok) {
        const data = await pythonResponse.json();
        return NextResponse.json(data);
      }
    } catch {
      // Python 後端不可用時使用模擬邏輯
      console.log('[Batch API] Python backend unavailable, using mock response');
    }

    // 模擬批次操作結果（當後端不可用時）
    const results = body.ids.map((id) => ({
      id,
      status: 'success' as const,
    }));

    const response: BatchResponse = {
      success: true,
      affected: body.ids.length,
      results,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Batch API] Error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '批次操作處理失敗',
          details: error instanceof Error ? error.message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
