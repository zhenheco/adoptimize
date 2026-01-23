'use client';

import { useState } from 'react';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { AutopilotStatus } from '@/components/dashboard/autopilot-status';
import { AIActionsList } from '@/components/dashboard/ai-actions-list';
import { PendingDecisions } from '@/components/dashboard/pending-decisions';

// Mock data - 之後會從 API 取得
const mockAutopilot = {
  enabled: true,
  targetCpa: 500,
  monthlyBudget: 50000,
  daysSinceStart: 15,
  totalSavings: 12400,
};

const mockActions = [
  {
    id: '1',
    date: '1/22',
    action: '暫停「測試廣告 A」',
    reason: '成本過高',
    savings: 2100,
  },
  {
    id: '2',
    date: '1/20',
    action: '加碼「熱銷商品」+20%',
    reason: '表現優異',
    earnings: 8500,
  },
  {
    id: '3',
    date: '1/18',
    action: '暫停 3 個疲勞素材',
    reason: '點擊率下降',
    savings: 1800,
  },
];

const mockDecisions = [
  {
    id: '1',
    type: 'budget_increase',
    title: '預算即將用完',
    description: '本月預算剩 $17,550（35%），預計 5 天後用完。以目前表現，建議加碼 $20,000 可多帶來約 40 筆訂單。',
    options: [
      { label: '不用了', value: 'ignore' },
      { label: '加碼 $10,000', value: 'add_10000' },
      { label: '加碼 $20,000', value: 'add_20000' },
    ],
  },
];

/**
 * 首頁儀表板
 *
 * SDD v2.0: 簡化設計，聚焦老闆關心的指標
 * - 自動駕駛狀態
 * - 3 個核心指標（花費、訂單、投報率）
 * - AI 執行記錄
 * - 待決定事項
 */
export default function DashboardPage() {
  const [decisions, setDecisions] = useState(mockDecisions);

  const handleDecide = (decisionId: string, value: string) => {
    // TODO: 呼叫 API 處理決策
    console.log('Decision:', decisionId, value);
    setDecisions((prev) => prev.filter((d) => d.id !== decisionId));
  };

  // 取得當前日期
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}（${['日', '一', '二', '三', '四', '五', '六'][today.getDay()]}）`;

  return (
    <div className="space-y-6">
      {/* 歡迎標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          👋 嗨，老闆
        </h1>
        <span className="text-gray-500 dark:text-gray-400">
          今天 {dateStr}
        </span>
      </div>

      {/* 自動駕駛狀態 */}
      <AutopilotStatus {...mockAutopilot} />

      {/* 本月指標 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 本月到目前為止
        </h2>
        <DashboardMetrics period="30d" />
      </div>

      {/* AI 執行記錄 */}
      <AIActionsList actions={mockActions} />

      {/* 待決定事項 */}
      <PendingDecisions decisions={decisions} onDecide={handleDecide} />
    </div>
  );
}
