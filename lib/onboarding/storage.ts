/**
 * localStorage key 常數
 */
const ONBOARDING_KEY = 'adoptimize_onboarding_completed';

/**
 * 檢查 Onboarding 是否已完成
 * @returns 是否已完成導覽
 */
export function isOnboardingCompleted(): boolean {
  // SSR 時預設已完成（不觸發導覽）
  if (typeof window === 'undefined') {
    return true;
  }

  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/**
 * 設置 Onboarding 完成狀態
 * @param completed 是否已完成
 */
export function setOnboardingCompleted(completed: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(ONBOARDING_KEY, String(completed));
}

/**
 * 重置 Onboarding 狀態
 * 清除 localStorage 中的完成記錄
 */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(ONBOARDING_KEY);
}
