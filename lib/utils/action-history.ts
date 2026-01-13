/**
 * 操作歷史工具函數
 *
 * 提供格式化、分組和顯示操作歷史記錄的工具
 */

/**
 * 操作歷史記錄項目
 */
export interface ActionHistoryItem {
  id: string;
  user_id: string;
  recommendation_id?: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  reverted: boolean;
  reverted_at?: string;
  created_at: string;
}

/**
 * 分組後的歷史記錄
 */
export interface GroupedHistory {
  label: string;
  date: string;
  items: ActionHistoryItem[];
}

/**
 * 格式化操作類型
 *
 * @param actionType - 操作類型代碼
 * @returns 中文顯示名稱
 */
export function formatActionType(actionType: string): string {
  const typeMap: Record<string, string> = {
    PAUSE: '暫停',
    ENABLE: '啟用',
    BUDGET_CHANGE: '調整預算',
    EXCLUDE_AUDIENCE: '排除受眾',
    REFRESH_CREATIVE: '更新素材',
    OPTIMIZE_BIDDING: '優化出價',
    ADD_NEGATIVE_KEYWORD: '新增排除關鍵字',
    ADJUST_TARGETING: '調整目標受眾',
  };

  return typeMap[actionType] || actionType;
}

/**
 * 格式化目標類型
 *
 * @param targetType - 目標類型代碼
 * @returns 中文顯示名稱
 */
export function formatTargetType(targetType: string): string {
  const typeMap: Record<string, string> = {
    CREATIVE: '素材',
    CAMPAIGN: '活動',
    ADSET: '廣告組',
    AD: '廣告',
    AUDIENCE: '受眾',
  };

  return typeMap[targetType] || targetType;
}

/**
 * 取得操作類型圖示名稱
 *
 * @param actionType - 操作類型代碼
 * @returns 圖示名稱（對應 lucide-react 圖示）
 */
export function getActionTypeIcon(actionType: string): string {
  const iconMap: Record<string, string> = {
    PAUSE: 'pause',
    ENABLE: 'play',
    BUDGET_CHANGE: 'trending-down',
    EXCLUDE_AUDIENCE: 'users',
    REFRESH_CREATIVE: 'refresh-cw',
    OPTIMIZE_BIDDING: 'settings',
    ADD_NEGATIVE_KEYWORD: 'minus-circle',
    ADJUST_TARGETING: 'target',
  };

  return iconMap[actionType] || 'settings';
}

/**
 * 計算相對時間
 *
 * @param dateString - ISO 日期字串
 * @returns 相對時間描述（如「5 分鐘前」）
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '剛剛';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} 分鐘前`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} 小時前`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} 天前`;
}

/**
 * 取得日期標籤
 *
 * @param date - 日期物件
 * @returns 日期標籤（「今天」、「昨天」或日期格式）
 */
function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (inputDate.getTime() === today.getTime()) {
    return '今天';
  }

  if (inputDate.getTime() === yesterday.getTime()) {
    return '昨天';
  }

  // 使用 MM/DD 格式
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 取得日期 key（用於分組）
 *
 * @param date - 日期物件
 * @returns 日期 key（YYYY-MM-DD 格式）
 */
function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 依日期分組歷史記錄
 *
 * @param history - 歷史記錄陣列
 * @returns 分組後的歷史記錄
 */
export function groupHistoryByDate(history: ActionHistoryItem[]): GroupedHistory[] {
  if (history.length === 0) {
    return [];
  }

  // 建立日期到項目的映射
  const grouped = new Map<string, ActionHistoryItem[]>();

  for (const item of history) {
    const date = new Date(item.created_at);
    const key = getDateKey(date);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  // 轉換為陣列並排序（最新的在前）
  const result: GroupedHistory[] = [];

  // 取得所有日期 key 並排序（降序）
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  for (const key of sortedKeys) {
    const items = grouped.get(key)!;
    const date = new Date(items[0].created_at);

    result.push({
      label: getDateLabel(date),
      date: key,
      items,
    });
  }

  return result;
}
