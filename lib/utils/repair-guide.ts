/**
 * Repair Guide Utilities
 *
 * Provides step-by-step repair guides for health audit issues
 * H-006: Step-by-step repair guide
 */

/**
 * 問題類別
 */
export type IssueCategory = 'STRUCTURE' | 'CREATIVE' | 'AUDIENCE' | 'BUDGET' | 'TRACKING';

/**
 * 修復步驟
 */
export interface RepairStep {
  /** 步驟 ID */
  id: string;
  /** 步驟順序 (1-based) */
  order: number;
  /** 步驟標題 */
  title: string;
  /** 步驟詳細描述 */
  description: string;
  /** 預估所需時間（分鐘） */
  estimatedMinutes: number;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 可選的連結 */
  link?: string;
  /** 可選的操作按鈕類型 */
  actionType?: 'navigate' | 'execute' | 'external';
}

/**
 * 修復指南資料庫
 * 每個問題代碼對應一組修復步驟
 */
const REPAIR_GUIDES: Record<string, Omit<RepairStep, 'id' | 'isCompleted'>[]> = {
  // ========== STRUCTURE Issues ==========
  STRUCTURE_NAMING: [
    {
      order: 1,
      title: '建立命名規則',
      description: '制定一套統一的廣告活動命名規則，例如：[品牌]_[目標]_[受眾]_[日期]',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '盤點現有活動',
      description: '列出所有不符合命名規則的廣告活動，準備重新命名',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '批次重新命名',
      description: '在廣告管理後台批次更新活動名稱，確保符合新規則',
      estimatedMinutes: 20,
      actionType: 'navigate',
    },
    {
      order: 4,
      title: '建立文檔紀錄',
      description: '將命名規則記錄在團隊文檔中，確保未來活動都遵循此規則',
      estimatedMinutes: 5,
    },
  ],

  STRUCTURE_ADSET_COUNT: [
    {
      order: 1,
      title: '分析廣告組數量',
      description: '檢查每個活動的廣告組數量，理想範圍是 3-10 個',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '合併相似廣告組',
      description: '將目標受眾或設定相似的廣告組合併，減少內部競爭',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '暫停效果不佳的廣告組',
      description: '暫停 CPA 過高或轉換率過低的廣告組',
      estimatedMinutes: 10,
      actionType: 'execute',
    },
  ],

  STRUCTURE_AD_COUNT: [
    {
      order: 1,
      title: '檢查廣告數量',
      description: '確認每個廣告組內有 3-6 則廣告，太少會限制優化空間',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '新增測試廣告',
      description: '為廣告數量不足的組別新增 2-3 則不同素材的廣告',
      estimatedMinutes: 20,
    },
    {
      order: 3,
      title: '移除重複廣告',
      description: '刪除素材或文案幾乎相同的重複廣告',
      estimatedMinutes: 10,
    },
  ],

  STRUCTURE_OBJECTIVE: [
    {
      order: 1,
      title: '確認轉換追蹤設定',
      description: '檢查轉換目標是否正確設定，追蹤事件是否觸發',
      estimatedMinutes: 15,
    },
    {
      order: 2,
      title: '對齊業務目標',
      description: '確認廣告活動目標與實際業務目標一致（如：購買 vs 加入購物車）',
      estimatedMinutes: 10,
    },
    {
      order: 3,
      title: '更新轉換設定',
      description: '在廣告管理後台更新轉換目標設定',
      estimatedMinutes: 15,
      actionType: 'navigate',
    },
  ],

  STRUCTURE_AUDIENCE_COMPETITION: [
    {
      order: 1,
      title: '識別競爭廣告組',
      description: '找出使用相同受眾的廣告組，這會造成自我競價',
      estimatedMinutes: 15,
    },
    {
      order: 2,
      title: '建立受眾區隔',
      description: '調整受眾設定，讓每個廣告組鎖定不同的受眾群體',
      estimatedMinutes: 20,
    },
    {
      order: 3,
      title: '設定受眾排除',
      description: '在廣告組層級設定互相排除，避免重複觸及',
      estimatedMinutes: 15,
      actionType: 'execute',
    },
  ],

  // ========== CREATIVE Issues ==========
  CREATIVE_DIVERSITY: [
    {
      order: 1,
      title: '盤點現有素材',
      description: '統計目前使用的素材類型（圖片、影片、輪播）分佈',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '規劃新素材類型',
      description: '決定需要新增的素材類型，建議至少包含 3 種不同類型',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '製作新素材',
      description: '製作或委託製作缺少類型的素材內容',
      estimatedMinutes: 30,
    },
    {
      order: 4,
      title: '上傳並測試',
      description: '將新素材上傳至廣告帳戶，設定 A/B 測試',
      estimatedMinutes: 15,
    },
  ],

  CREATIVE_FATIGUE: [
    {
      order: 1,
      title: '識別疲勞素材',
      description: '找出 CTR 下降超過 15%、頻率超過 3 次的素材',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '暫停疲勞素材',
      description: '暫停疲勞度最高的素材，減少無效曝光',
      estimatedMinutes: 5,
      actionType: 'execute',
    },
    {
      order: 3,
      title: '準備替換素材',
      description: '製作新素材或調整現有素材的視覺元素',
      estimatedMinutes: 30,
    },
    {
      order: 4,
      title: '上線新素材',
      description: '用新素材替換被暫停的疲勞素材',
      estimatedMinutes: 10,
    },
  ],

  CREATIVE_FREQUENCY: [
    {
      order: 1,
      title: '檢查頻率數據',
      description: '查看各素材的平均曝光頻率，理想值低於 3 次',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '擴大受眾範圍',
      description: '增加目標受眾規模，或調整 Lookalike 百分比',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '設定頻率上限',
      description: '在廣告組設定中配置頻率上限（如：每 7 天最多 3 次）',
      estimatedMinutes: 10,
      actionType: 'navigate',
    },
  ],

  CREATIVE_FRESHNESS: [
    {
      order: 1,
      title: '盤點素材上線時間',
      description: '檢查各素材的使用天數，超過 30 天需要更新',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '建立素材輪換計劃',
      description: '制定每 2-4 週更新一批素材的計劃',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '準備新素材庫',
      description: '提前準備下一批素材，確保輪換不中斷',
      estimatedMinutes: 30,
    },
  ],

  CREATIVE_COPY_LENGTH: [
    {
      order: 1,
      title: '檢查被截斷文案',
      description: '找出標題或描述被截斷的廣告',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '縮短文案長度',
      description: '將標題控制在 25 字內，描述控制在 90 字內',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '預覽調整效果',
      description: '使用廣告預覽功能確認文案在各平台正確顯示',
      estimatedMinutes: 10,
    },
  ],

  // ========== AUDIENCE Issues ==========
  AUDIENCE_SIZE: [
    {
      order: 1,
      title: '評估受眾規模',
      description: '檢查受眾規模，理想範圍是 10K - 2M',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '調整受眾設定',
      description: '擴大或縮小受眾範圍，達到理想規模',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '測試新受眾',
      description: '建立測試活動，驗證調整後的受眾效果',
      estimatedMinutes: 20,
    },
  ],

  AUDIENCE_OVERLAP: [
    {
      order: 1,
      title: '分析受眾重疊',
      description: '使用受眾重疊工具檢查各受眾間的重疊率',
      estimatedMinutes: 15,
    },
    {
      order: 2,
      title: '決定保留策略',
      description: '選擇保留效果較好的受眾，排除另一個',
      estimatedMinutes: 10,
    },
    {
      order: 3,
      title: '設定排除規則',
      description: '在廣告組中設定受眾排除，避免重複觸及',
      estimatedMinutes: 10,
      actionType: 'execute',
    },
  ],

  AUDIENCE_EXCLUSION: [
    {
      order: 1,
      title: '建立已轉換受眾',
      description: '建立包含已購買/已註冊用戶的自訂受眾',
      estimatedMinutes: 15,
    },
    {
      order: 2,
      title: '設定排除',
      description: '在各廣告組中排除已轉換受眾',
      estimatedMinutes: 10,
      actionType: 'execute',
    },
    {
      order: 3,
      title: '驗證排除效果',
      description: '檢查排除後的觸及數變化，確認設定正確',
      estimatedMinutes: 10,
    },
  ],

  AUDIENCE_LOOKALIKE: [
    {
      order: 1,
      title: '評估來源受眾',
      description: '確認 Lookalike 來源是高品質受眾（如：購買者）',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '重建 Lookalike',
      description: '基於最佳客戶資料重新建立 Lookalike 受眾',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '測試不同百分比',
      description: '建立 1%、3%、5% 的 Lookalike 進行 A/B 測試',
      estimatedMinutes: 20,
    },
  ],

  AUDIENCE_FRESHNESS: [
    {
      order: 1,
      title: '檢查受眾更新時間',
      description: '確認自訂受眾的最後更新時間',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '更新受眾資料',
      description: '重新上傳客戶名單或刷新網站受眾',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '設定自動更新',
      description: '配置受眾自動刷新規則，保持資料新鮮',
      estimatedMinutes: 10,
    },
  ],

  // ========== BUDGET Issues ==========
  BUDGET_ALLOCATION: [
    {
      order: 1,
      title: '分析活動效能',
      description: '比較各活動的 CPA 和 ROAS，找出高效活動',
      estimatedMinutes: 15,
    },
    {
      order: 2,
      title: '重新分配預算',
      description: '將預算從低效活動轉移到高效活動',
      estimatedMinutes: 10,
    },
    {
      order: 3,
      title: '設定自動規則',
      description: '建立自動預算調整規則，持續優化分配',
      estimatedMinutes: 15,
      actionType: 'navigate',
    },
  ],

  BUDGET_UTILIZATION: [
    {
      order: 1,
      title: '檢查預算消耗',
      description: '確認每日預算使用率，理想為 80-100%',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '調整出價策略',
      description: '提高出價或切換到更激進的出價策略',
      estimatedMinutes: 10,
    },
    {
      order: 3,
      title: '擴大目標受眾',
      description: '增加可投放受眾，提高曝光機會',
      estimatedMinutes: 15,
    },
  ],

  BUDGET_LEARNING: [
    {
      order: 1,
      title: '評估學習期狀態',
      description: '檢查廣告組是否仍在學習期，需要足夠轉換才能退出',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '增加日預算',
      description: '將日預算設定為至少 10 倍目標 CPA，加速學習',
      estimatedMinutes: 10,
    },
    {
      order: 3,
      title: '避免頻繁修改',
      description: '在學習期間避免修改設定，讓系統累積足夠數據',
      estimatedMinutes: 5,
    },
  ],

  BUDGET_BIDDING: [
    {
      order: 1,
      title: '評估出價策略',
      description: '檢查目前出價策略是否符合活動目標',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '選擇適合策略',
      description: '根據目標選擇：最大轉換、目標 CPA 或目標 ROAS',
      estimatedMinutes: 10,
    },
    {
      order: 3,
      title: '設定出價上限',
      description: '配置合理的出價上限，避免成本失控',
      estimatedMinutes: 10,
      actionType: 'navigate',
    },
  ],

  BUDGET_INEFFICIENT: [
    {
      order: 1,
      title: '識別低效支出',
      description: '找出 CPA 超過平均 30% 以上的活動或廣告組',
      estimatedMinutes: 15,
    },
    {
      order: 2,
      title: '暫停低效項目',
      description: '暫停效果最差的 20% 廣告組或廣告',
      estimatedMinutes: 10,
      actionType: 'execute',
    },
    {
      order: 3,
      title: '優化剩餘項目',
      description: '針對保留的項目進行受眾或素材優化',
      estimatedMinutes: 20,
    },
  ],

  // ========== TRACKING Issues ==========
  TRACKING_CONVERSION: [
    {
      order: 1,
      title: '確認轉換事件',
      description: '列出需要追蹤的轉換事件（購買、註冊、加入購物車等）',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '設定轉換追蹤',
      description: '在廣告平台設定轉換追蹤代碼',
      estimatedMinutes: 20,
      actionType: 'navigate',
    },
    {
      order: 3,
      title: '驗證追蹤正常',
      description: '使用 Pixel Helper 或 Tag Assistant 確認追蹤觸發',
      estimatedMinutes: 15,
    },
  ],

  TRACKING_PIXEL: [
    {
      order: 1,
      title: '檢查 Pixel 狀態',
      description: '在廣告平台確認 Pixel 是否正常運作',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '重新安裝 Pixel',
      description: '如有問題，重新安裝 Pixel 代碼到網站',
      estimatedMinutes: 20,
      actionType: 'navigate',
    },
    {
      order: 3,
      title: '測試事件觸發',
      description: '在網站上執行動作，確認事件正確傳送',
      estimatedMinutes: 15,
    },
  ],

  TRACKING_EVENTS: [
    {
      order: 1,
      title: '規劃追蹤事件',
      description: '定義完整的轉換漏斗事件（瀏覽 → 加購 → 結帳 → 購買）',
      estimatedMinutes: 15,
    },
    {
      order: 2,
      title: '實作事件追蹤',
      description: '在網站各步驟加入對應的追蹤事件',
      estimatedMinutes: 30,
      actionType: 'navigate',
    },
    {
      order: 3,
      title: '驗證事件流程',
      description: '完整走一次流程，確認所有事件都正確觸發',
      estimatedMinutes: 15,
    },
  ],

  TRACKING_UTM: [
    {
      order: 1,
      title: '建立 UTM 規則',
      description: '制定一套統一的 UTM 參數命名規則',
      estimatedMinutes: 10,
    },
    {
      order: 2,
      title: '更新廣告連結',
      description: '為所有廣告連結加上正確的 UTM 參數',
      estimatedMinutes: 20,
    },
    {
      order: 3,
      title: '驗證 GA 報表',
      description: '在 Google Analytics 確認 UTM 參數正確傳入',
      estimatedMinutes: 10,
    },
  ],

  TRACKING_MISSING: [
    {
      order: 1,
      title: '安裝追蹤代碼',
      description: '在網站安裝 Google Ads 和 Meta Pixel 追蹤代碼',
      estimatedMinutes: 20,
    },
    {
      order: 2,
      title: '設定轉換事件',
      description: '配置需要追蹤的關鍵轉換事件',
      estimatedMinutes: 15,
    },
    {
      order: 3,
      title: '驗證安裝結果',
      description: '使用瀏覽器擴充工具驗證追蹤正常運作',
      estimatedMinutes: 10,
    },
  ],
};

/**
 * 通用修復步驟（用於未定義的問題代碼）
 */
const GENERIC_STEPS: Omit<RepairStep, 'id' | 'isCompleted'>[] = [
  {
    order: 1,
    title: '分析問題原因',
    description: '仔細閱讀問題描述，了解根本原因',
    estimatedMinutes: 10,
  },
  {
    order: 2,
    title: '執行修復動作',
    description: '根據建議解決方案進行修改',
    estimatedMinutes: 15,
  },
  {
    order: 3,
    title: '驗證修復結果',
    description: '確認問題已解決，重新執行健檢驗證',
    estimatedMinutes: 10,
  },
];

/**
 * 取得指定問題的修復步驟
 *
 * @param issueCode 問題代碼
 * @param category 問題類別
 * @returns 修復步驟陣列
 */
export function getRepairSteps(issueCode: string, category: IssueCategory): RepairStep[] {
  const steps = REPAIR_GUIDES[issueCode] || GENERIC_STEPS;

  return steps.map((step, index) => ({
    ...step,
    id: `${issueCode}-step-${index + 1}`,
    isCompleted: false,
  }));
}

/**
 * 計算修復進度百分比
 *
 * @param steps 修復步驟陣列
 * @returns 進度百分比 (0-100)
 */
export function calculateRepairProgress(steps: RepairStep[]): number {
  if (steps.length === 0) return 0;

  const completedCount = steps.filter((step) => step.isCompleted).length;
  return Math.round((completedCount / steps.length) * 100);
}

/**
 * 檢查是否所有步驟都已完成
 *
 * @param steps 修復步驟陣列
 * @returns 是否全部完成
 */
export function areAllStepsComplete(steps: RepairStep[]): boolean {
  if (steps.length === 0) return false;
  return steps.every((step) => step.isCompleted);
}

/**
 * 計算預估總時間
 *
 * @param steps 修復步驟陣列
 * @returns 總預估時間（分鐘）
 */
export function calculateEstimatedTime(steps: RepairStep[]): number {
  return steps.reduce((total, step) => total + step.estimatedMinutes, 0);
}

/**
 * 計算剩餘時間
 *
 * @param steps 修復步驟陣列
 * @returns 剩餘時間（分鐘）
 */
export function calculateRemainingTime(steps: RepairStep[]): number {
  return steps
    .filter((step) => !step.isCompleted)
    .reduce((total, step) => total + step.estimatedMinutes, 0);
}
