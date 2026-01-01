/**
 * 術語分類類型
 * - metric: 效能指標（CPA、ROAS、CTR 等）
 * - status: 狀態分數（疲勞度、健康度）
 * - dimension: 維度類型（帳戶結構、素材品質等）
 */
export type GlossaryCategory = 'metric' | 'status' | 'dimension';

/**
 * 術語定義介面
 */
export interface GlossaryTerm {
  /** 術語唯一識別碼 */
  id: string;
  /** 術語顯示名稱 */
  term: string;
  /** 術語定義說明（1-2 句話） */
  definition: string;
  /** 範例說明（可選） */
  example?: string;
  /** 術語分類 */
  category: GlossaryCategory;
}
