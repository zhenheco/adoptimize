import { NextRequest, NextResponse } from 'next/server';

// Python 後端 URL
const PYTHON_API = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

/**
 * GET /api/v1/history
 *
 * 取得操作歷史記錄
 * 支援篩選和搜尋
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  try {
    const { searchParams } = new URL(request.url);

    // 嘗試從 Python 後端獲取資料
    try {
      const response = await fetch(`${PYTHON_API}/api/v1/history?${searchParams}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // Python 後端不可用，使用模擬資料
    }

    // 模擬資料 - 開發階段使用
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const mockHistory = [
      {
        id: 'hist-1',
        user_id: 'user-1',
        recommendation_id: 'rec-1',
        action_type: 'PAUSE',
        target_type: 'CREATIVE',
        target_id: 'creative-1',
        target_name: '夏季促銷橫幅 A',
        before_state: { status: 'active' },
        after_state: { status: 'paused' },
        reverted: false,
        created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 分鐘前
      },
      {
        id: 'hist-2',
        user_id: 'user-1',
        recommendation_id: 'rec-2',
        action_type: 'PAUSE',
        target_type: 'CREATIVE',
        target_id: 'creative-2',
        target_name: '產品展示視頻',
        before_state: { status: 'active' },
        after_state: { status: 'paused' },
        reverted: false,
        created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 小時前
      },
      {
        id: 'hist-3',
        user_id: 'user-1',
        recommendation_id: 'rec-3',
        action_type: 'BUDGET_CHANGE',
        target_type: 'CAMPAIGN',
        target_id: 'campaign-1',
        target_name: '品牌認知活動',
        before_state: { budget: 1000 },
        after_state: { budget: 800 },
        reverted: false,
        created_at: yesterday.toISOString(),
      },
      {
        id: 'hist-4',
        user_id: 'user-1',
        recommendation_id: 'rec-4',
        action_type: 'EXCLUDE_AUDIENCE',
        target_type: 'AUDIENCE',
        target_id: 'audience-1',
        target_name: '網站訪客 30 天',
        before_state: { excluded: false },
        after_state: { excluded: true, excluded_from: 'Lookalike 1%' },
        reverted: false,
        created_at: yesterday.toISOString(),
      },
      {
        id: 'hist-5',
        user_id: 'user-1',
        recommendation_id: 'rec-5',
        action_type: 'ENABLE',
        target_type: 'AD',
        target_id: 'ad-1',
        target_name: '產品廣告 A - 年末促銷',
        before_state: { status: 'paused' },
        after_state: { status: 'active' },
        reverted: true,
        reverted_at: twoDaysAgo.toISOString(),
        created_at: threeDaysAgo.toISOString(),
      },
      {
        id: 'hist-6',
        user_id: 'user-1',
        recommendation_id: 'rec-6',
        action_type: 'BUDGET_CHANGE',
        target_type: 'ADSET',
        target_id: 'adset-1',
        target_name: '高價值受眾組',
        before_state: { budget: 500 },
        after_state: { budget: 700 },
        reverted: false,
        created_at: oneWeekAgo.toISOString(),
      },
    ];

    // 套用篩選
    let filtered = mockHistory;

    const actionType = searchParams.get('action_type');
    if (actionType) {
      filtered = filtered.filter((h) => h.action_type === actionType);
    }

    const targetType = searchParams.get('target_type');
    if (targetType) {
      filtered = filtered.filter((h) => h.target_type === targetType);
    }

    const search = searchParams.get('search');
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.target_name?.toLowerCase().includes(lowerSearch) ||
          h.action_type.toLowerCase().includes(lowerSearch)
      );
    }

    return NextResponse.json({
      data: filtered,
      meta: {
        total: filtered.length,
      },
    });
  } catch (error) {
    console.error('History API Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '無法載入操作歷史' } },
      { status: 500 }
    );
  }
}
