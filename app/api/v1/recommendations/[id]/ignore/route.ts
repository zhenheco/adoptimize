import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v1/recommendations/:id/ignore
 * 忽略建議
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: 呼叫 Python 後端 API 更新建議狀態
  // 目前只回傳成功狀態

  console.log(`Ignoring recommendation: ${id}`);

  // 模擬處理時間
  await new Promise((resolve) => setTimeout(resolve, 300));

  return NextResponse.json({
    success: true,
    data: {
      id,
      status: 'ignored',
      ignored_at: new Date().toISOString(),
    },
  });
}
