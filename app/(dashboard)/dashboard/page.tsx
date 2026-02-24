'use client';

import { useEffect, useState } from 'react';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { AutopilotStatus } from '@/components/dashboard/autopilot-status';
import { AIActionsList } from '@/components/dashboard/ai-actions-list';
import { PendingDecisions } from '@/components/dashboard/pending-decisions';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';

// Mock data - API 失敗時的預設資料
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
  const [autopilot, setAutopilot] = useState(mockAutopilot);
  const [actions, setActions] = useState(mockActions);
  const [decisions, setDecisions] = useState(mockDecisions);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // 從 API 載入資料，失敗時使用 mock data
  useEffect(() => {
    async function fetchDashboardData() {
      let usingMock = false;

      try {
        const [autopilotRes, actionsRes, decisionsRes] = await Promise.all([
          fetchWithAuth('/api/v1/autopilot/status').catch(() => null),
          fetchWithAuth('/api/v1/autopilot/actions').catch(() => null),
          fetchWithAuth('/api/v1/autopilot/decisions').catch(() => null),
        ]);

        if (autopilotRes?.ok) {
          const data = await autopilotRes.json();
          setAutopilot(data);
        } else {
          usingMock = true;
        }

        if (actionsRes?.ok) {
          const data = await actionsRes.json();
          if (data.length > 0) {
            setActions(data);
          } else {
            usingMock = true;
          }
        } else {
          usingMock = true;
        }

        if (decisionsRes?.ok) {
          const data = await decisionsRes.json();
          setDecisions(data);
        } else {
          usingMock = true;
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        usingMock = true;
      }

      setIsUsingMockData(usingMock);
    }

    fetchDashboardData();
  }, []);

  const handleDecide = async (decisionId: string, value: string) => {
    try {
      const res = await fetchWithAuth('/api/v1/autopilot/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_id: decisionId, value }),
      });
      if (!res.ok) {
        console.warn('Decision API failed, removing locally');
      }
    } catch (err) {
      console.warn('Decision API unavailable:', err);
    }
    // 無論 API 成功與否，都從 UI 移除
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

      {/* 使用展示資料提示 */}
      {isUsingMockData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          目前顯示的是展示資料。連接廣告帳號後將顯示真實數據。
        </div>
      )}

      {/* 自動駕駛狀態 */}
      <AutopilotStatus {...autopilot} />

      {/* 本月指標 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 本月到目前為止
        </h2>
        <DashboardMetrics period="30d" />
      </div>

      {/* AI 執行記錄 */}
      <AIActionsList actions={actions} />

      {/* 待決定事項 */}
      <PendingDecisions decisions={decisions} onDecide={handleDecide} />
    </div>
  );
}
