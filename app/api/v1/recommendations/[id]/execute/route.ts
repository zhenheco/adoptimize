import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v1/recommendations/:id/execute
 * 執行建議
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: 呼叫 Python 後端 API 實際執行建議
  // 目前只回傳成功狀態

  console.log(`Executing recommendation: ${id}`);

  // 模擬處理時間
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    data: {
      id,
      status: 'executed',
      executed_at: new Date().toISOString(),
    },
  });
}
