import { NextRequest, NextResponse } from 'next/server';

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

    // TODO: 呼叫 Python 後端 API 更新建議狀態
    // 目前只回傳成功狀態

    console.log(`Snoozing recommendation: ${id} until ${snooze_until}`);

    // 模擬處理時間
    await new Promise((resolve) => setTimeout(resolve, 200));

    return NextResponse.json({
      success: true,
      data: {
        id,
        status: 'snoozed',
        snooze_until,
        snoozed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Snooze API Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '延後操作失敗' } },
      { status: 500 }
    );
  }
}
