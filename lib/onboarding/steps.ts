import type { OnboardingStep } from './types';

/**
 * Onboarding 導覽步驟定義
 *
 * 設計原則：
 * 1. 教用戶「如何使用這個工具」，不是教他們投廣告
 * 2. 簡短扼要，避免資訊過載
 * 3. 引導用戶從「帳戶健檢」開始使用
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Step 1: 歡迎
  {
    target: 'body',
    content:
      '歡迎使用 AdOptimize！讓我們花 1 分鐘帶您了解如何使用這個工具來優化您的廣告效能。',
    placement: 'center',
    disableBeacon: true,
    title: '歡迎使用 AdOptimize',
  },

  // Step 2: 側邊欄導航總覽
  {
    target: 'nav.flex-1',
    content:
      '這是主導航區域。您可以在這裡切換不同功能模組，每個模組專注於廣告優化的不同面向。',
    placement: 'right',
    title: '導航功能',
  },

  // Step 3: 儀表板
  {
    target: '[href="/dashboard"]',
    content:
      '儀表板提供您廣告帳戶的整體效能摘要，包含花費、曝光、點擊、轉換等核心指標。',
    placement: 'right',
    title: '儀表板',
  },

  // Step 4: 素材管理
  {
    target: '[href="/creatives"]',
    content:
      '在素材管理中，您可以追蹤每個廣告素材的效能和「疲勞度」，及時發現需要更換的素材。',
    placement: 'right',
    title: '素材管理',
  },

  // Step 5: 受眾分析
  {
    target: '[href="/audiences"]',
    content:
      '受眾分析幫助您了解各個受眾群組的效能表現，找出最有價值的目標受眾。',
    placement: 'right',
    title: '受眾分析',
  },

  // Step 6: 帳戶健檢（重點推薦）
  {
    target: '[href="/health"]',
    content:
      '帳戶健檢會從 5 個維度評估您的廣告帳戶，找出潛在問題並提供改善建議。建議您從這裡開始！',
    placement: 'right',
    title: '帳戶健檢（建議起點）',
    styles: {
      options: {
        primaryColor: '#22c55e', // 綠色強調
      },
    },
  },

  // Step 7: 行動中心
  {
    target: '[href="/actions"]',
    content:
      '行動中心彙整所有優化建議，您可以一鍵執行或忽略這些建議。',
    placement: 'right',
    title: '行動中心',
  },

  // Step 8: 完成
  {
    target: 'body',
    content:
      '導覽完成！建議先到「帳戶健檢」查看您的帳戶狀態。如需重新觀看導覽，可在設定區找到「重新觀看導覽」按鈕。',
    placement: 'center',
    title: '導覽完成',
  },
];
