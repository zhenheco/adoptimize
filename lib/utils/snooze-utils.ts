/**
 * 延後處理（Snooze）工具函數
 *
 * 提供計算延後時間、檢查到期、格式化顯示的工具
 */

/**
 * 延後時間選項類型
 */
export type SnoozeDuration = '1h' | '4h' | '1d' | '3d' | '7d';

/**
 * 延後選項
 */
export interface SnoozeOption {
  value: SnoozeDuration;
  label: string;
  snooze_until: string;
}

/**
 * 計算延後到期時間
 *
 * @param duration - 延後時間類型
 * @returns ISO 格式的到期時間字串
 */
export function calculateSnoozeUntil(duration: SnoozeDuration): string {
  const now = new Date();
  const result = new Date(now);

  switch (duration) {
    case '1h':
      result.setHours(result.getHours() + 1);
      break;
    case '4h':
      result.setHours(result.getHours() + 4);
      break;
    case '1d':
      result.setDate(result.getDate() + 1);
      break;
    case '3d':
      result.setDate(result.getDate() + 3);
      break;
    case '7d':
      result.setDate(result.getDate() + 7);
      break;
  }

  return result.toISOString();
}

/**
 * 檢查延後是否已到期
 *
 * @param snoozeUntil - ISO 格式的到期時間字串
 * @returns 是否已到期
 */
export function isSnoozeExpired(snoozeUntil: string | undefined): boolean {
  if (!snoozeUntil) {
    return false;
  }

  const now = new Date();
  const until = new Date(snoozeUntil);

  return now >= until;
}

/**
 * 格式化剩餘時間
 *
 * @param snoozeUntil - ISO 格式的到期時間字串
 * @returns 格式化的剩餘時間描述
 */
export function formatSnoozeRemaining(snoozeUntil: string): string {
  const now = new Date();
  const until = new Date(snoozeUntil);
  const diffMs = until.getTime() - now.getTime();

  if (diffMs <= 0) {
    return '已到期';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1) {
    return `${diffDays} 天後到期`;
  }

  if (diffHours >= 1) {
    return `${diffHours} 小時後到期`;
  }

  return `${diffMinutes} 分鐘後到期`;
}

/**
 * 取得所有延後選項
 *
 * @returns 延後選項列表
 */
export function getSnoozeOptions(): SnoozeOption[] {
  const durations: { value: SnoozeDuration; label: string }[] = [
    { value: '1h', label: '1 小時後' },
    { value: '4h', label: '4 小時後' },
    { value: '1d', label: '明天' },
    { value: '3d', label: '3 天後' },
    { value: '7d', label: '1 週後' },
  ];

  return durations.map((d) => ({
    ...d,
    snooze_until: calculateSnoozeUntil(d.value),
  }));
}
