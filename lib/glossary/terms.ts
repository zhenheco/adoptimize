import type { GlossaryTerm } from './types';

/**
 * 廣告術語定義集合
 * 集中管理所有術語定義，方便維護和未來多語言支援
 */
export const GLOSSARY_TERMS: Record<string, GlossaryTerm> = {
  // ==================== 效能指標 ====================
  spend: {
    id: 'spend',
    term: '總花費',
    definition: '在指定期間內的廣告總支出金額。',
    category: 'metric',
  },
  impressions: {
    id: 'impressions',
    term: '曝光次數',
    definition: '廣告被展示的總次數。同一用戶多次看到同一則廣告會計算為多次曝光。',
    category: 'metric',
  },
  clicks: {
    id: 'clicks',
    term: '點擊數',
    definition: '用戶點擊廣告的總次數。',
    category: 'metric',
  },
  conversions: {
    id: 'conversions',
    term: '轉換數',
    definition: '用戶完成目標動作（如購買、註冊、填表）的總次數。',
    category: 'metric',
  },
  cpa: {
    id: 'cpa',
    term: 'CPA',
    definition: '每次轉換成本（Cost Per Acquisition）。計算方式為總花費除以轉換次數。',
    example: '如果花費 $100 獲得 10 次轉換，CPA = $10',
    category: 'metric',
  },
  roas: {
    id: 'roas',
    term: 'ROAS',
    definition: '廣告投資報酬率（Return On Ad Spend）。計算方式為收入除以廣告花費。',
    example: 'ROAS 2.5x 表示每花 $1 廣告費可獲得 $2.5 收入',
    category: 'metric',
  },
  ctr: {
    id: 'ctr',
    term: 'CTR',
    definition: '點擊率（Click-Through Rate）。計算方式為點擊次數除以曝光次數。',
    example: '1000 次曝光中有 20 次點擊，CTR = 2%',
    category: 'metric',
  },
  cvr: {
    id: 'cvr',
    term: 'CVR',
    definition: '轉換率（Conversion Rate）。計算方式為轉換次數除以點擊次數。',
    example: '100 次點擊中有 5 次轉換，CVR = 5%',
    category: 'metric',
  },

  // ==================== 狀態分數 ====================
  fatigue_score: {
    id: 'fatigue_score',
    term: '疲勞度分數',
    definition:
      '衡量素材被重複展示導致效能下降的程度。分數 0-100，越高表示素材越需要更換。',
    example: '疲勞度 > 70 表示素材效能明顯下降，建議更換',
    category: 'status',
  },
  health_score: {
    id: 'health_score',
    term: '健康度分數',
    definition:
      '綜合評估廣告帳戶或受眾的整體狀態。分數 0-100，越高越健康。',
    example: '健康度 > 80 為優良，60-80 為普通，< 60 需要關注',
    category: 'status',
  },

  // ==================== 維度類型 ====================
  account_structure: {
    id: 'account_structure',
    term: '帳戶結構',
    definition: '評估廣告帳戶的組織架構是否合理，包含廣告系列、廣告組的層級設計。',
    category: 'dimension',
  },
  creative_quality: {
    id: 'creative_quality',
    term: '素材品質',
    definition: '評估廣告素材的整體品質，包含圖片、文案、影片的效能表現。',
    category: 'dimension',
  },
  audience_setup: {
    id: 'audience_setup',
    term: '受眾設定',
    definition: '評估目標受眾的設定是否精準，包含受眾規模、重疊度、更新頻率。',
    category: 'dimension',
  },
  budget_allocation: {
    id: 'budget_allocation',
    term: '預算配置',
    definition: '評估廣告預算分配是否合理，是否有預算浪費或分配不均的情況。',
    category: 'dimension',
  },
  tracking_setup: {
    id: 'tracking_setup',
    term: '追蹤設定',
    definition: '評估轉換追蹤、像素設定是否正確，確保數據收集完整準確。',
    category: 'dimension',
  },
};

/**
 * 根據術語 ID 取得術語定義
 * @param termId 術語 ID
 * @returns 術語定義物件，找不到時返回 undefined
 */
export function getTerm(termId: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS[termId];
}

/**
 * 根據分類取得術語列表
 * @param category 術語分類
 * @returns 該分類的所有術語
 */
export function getTermsByCategory(
  category: GlossaryTerm['category']
): GlossaryTerm[] {
  return Object.values(GLOSSARY_TERMS).filter(
    (term) => term.category === category
  );
}
