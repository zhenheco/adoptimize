import { NextRequest, NextResponse } from 'next/server';
import type { Recommendation, ApiResponse } from '@/lib/api/types';

/**
 * 建議類型定義
 */
type RecommendationType =
  | 'PAUSE_CREATIVE'
  | 'REDUCE_BUDGET'
  | 'EXCLUDE_AUDIENCE'
  | 'REFRESH_CREATIVE'
  | 'INCREASE_BUDGET'
  | 'OPTIMIZE_BIDDING';

/**
 * 產生模擬建議資料
 * TODO: 連接 Python 後端 API
 */
function generateMockRecommendations(): Recommendation[] {
  const recommendations: Recommendation[] = [
    {
      id: 'rec-1',
      type: 'PAUSE_CREATIVE',
      priority_score: 185,
      title: '暫停疲勞素材「Summer Sale Banner」',
      description:
        '此素材的 CTR 過去 7 天下降 25%，投放頻率達 4.2 次。建議立即暫停並替換新素材以避免預算浪費。',
      action_module: 'creative_controller',
      estimated_impact: 150.0,
      status: 'pending',
    },
    {
      id: 'rec-2',
      type: 'REDUCE_BUDGET',
      priority_score: 165,
      title: '降低低效廣告組「Broad Audience」預算',
      description:
        '此廣告組的 CPA 高於帳戶平均 45%，ROAS 僅 0.8x。建議降低預算 30% 並將資源轉移至高效廣告組。',
      action_module: 'budget_controller',
      estimated_impact: 120.0,
      status: 'pending',
    },
    {
      id: 'rec-3',
      type: 'EXCLUDE_AUDIENCE',
      priority_score: 145,
      title: '排除重疊受眾：Website Visitors × Lookalike 1%',
      description:
        '這兩個受眾的重疊率達 35%，導致同一用戶可能看到重複廣告。建議在其中一個廣告組排除另一受眾。',
      action_module: 'audience_controller',
      estimated_impact: 85.0,
      status: 'pending',
    },
    {
      id: 'rec-4',
      type: 'REFRESH_CREATIVE',
      priority_score: 130,
      title: '更新素材「Holiday Promo Video」',
      description:
        '此素材已投放 28 天，雖然尚未疲勞但建議準備替換素材以維持新鮮度和用戶興趣。',
      action_module: 'creative_controller',
      estimated_impact: 60.0,
      status: 'pending',
    },
    {
      id: 'rec-5',
      type: 'INCREASE_BUDGET',
      priority_score: 125,
      title: '增加高效廣告組「Retargeting Pool」預算',
      description:
        '此廣告組的 ROAS 達 4.2x，但預算消耗率僅 65%。建議增加預算 20% 以獲取更多轉換。',
      action_module: 'budget_controller',
      estimated_impact: 200.0,
      status: 'pending',
    },
    {
      id: 'rec-6',
      type: 'OPTIMIZE_BIDDING',
      priority_score: 110,
      title: '優化出價策略：Campaign Alpha',
      description:
        '此活動使用手動出價但 CPA 波動較大。建議切換至目標 CPA 出價策略以獲得更穩定的成本。',
      action_module: 'bidding_controller',
      estimated_impact: 75.0,
      status: 'pending',
    },
  ];

  return recommendations;
}

/**
 * 計算優先級分數
 *
 * 公式: 嚴重度基礎分 + 金額影響分 + 修復難度分 + 影響範圍分
 */
function calculatePriorityScore(
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
  estimatedImpact: number,
  difficulty: 'ONE_CLICK' | 'EASY' | 'MEDIUM' | 'COMPLEX',
  affectedEntities: number
): number {
  // 嚴重度基礎分
  const severityScores = {
    CRITICAL: 100,
    HIGH: 70,
    MEDIUM: 40,
    LOW: 20,
  };

  // 修復難度分
  const difficultyScores = {
    ONE_CLICK: 30,
    EASY: 20,
    MEDIUM: 10,
    COMPLEX: 0,
  };

  const severityScore = severityScores[severity];
  const impactScore = Math.min(estimatedImpact / 100, 50); // 上限 50 分
  const difficultyScore = difficultyScores[difficulty];
  const scopeScore = affectedEntities * 5; // 無上限

  return Math.round(severityScore + impactScore + difficultyScore + scopeScore);
}

/**
 * GET /api/v1/recommendations
 * 取得建議列表
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 解析查詢參數
  const status = searchParams.get('status') || 'pending';

  // 產生模擬資料
  let recommendations = generateMockRecommendations();

  // 狀態篩選
  if (status && status !== 'all') {
    recommendations = recommendations.filter((r) => r.status === status);
  }

  // 按優先級排序（高到低）
  recommendations.sort((a, b) => b.priority_score - a.priority_score);

  const response: ApiResponse<Recommendation[]> = {
    data: recommendations,
    meta: {
      total: recommendations.length,
    },
  };

  return NextResponse.json(response);
}
