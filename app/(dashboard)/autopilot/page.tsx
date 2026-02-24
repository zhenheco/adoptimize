'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';

interface AutopilotSettings {
  enabled: boolean;
  goalType: 'maximize_conversions' | 'maximize_revenue' | 'minimize_cost';
  targetCpa: number | null;
  monthlyBudget: number | null;
  autoPauseEnabled: boolean;
  autoFatigueEnabled: boolean;
  autoAdjustBudgetEnabled: boolean;
  autoBoostEnabled: boolean;
}

interface LogEntry {
  id: string;
  date: string;
  action: string;
  savings?: number;
  earnings?: number;
}

// Mock data - API 失敗時的預設資料
const mockSettings: AutopilotSettings = {
  enabled: true,
  goalType: 'maximize_conversions',
  targetCpa: 500,
  monthlyBudget: 50000,
  autoPauseEnabled: true,
  autoFatigueEnabled: true,
  autoAdjustBudgetEnabled: true,
  autoBoostEnabled: false,
};

const mockLogs: LogEntry[] = [
  { id: '1', date: '1/22 14:30', action: '暫停「測試廣告 A」', savings: 2100 },
  { id: '2', date: '1/20 09:15', action: '加碼「熱銷商品」+20%', earnings: 8500 },
  { id: '3', date: '1/18 16:45', action: '暫停 3 個疲勞素材', savings: 1800 },
];

export default function AutopilotPage() {
  const [settings, setSettings] = useState<AutopilotSettings>(mockSettings);
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 從 API 載入設定和執行記錄
  useEffect(() => {
    async function fetchData() {
      let usingMock = false;

      try {
        const [settingsRes, logsRes] = await Promise.all([
          fetchWithAuth('/api/v1/autopilot/settings').catch(() => null),
          fetchWithAuth('/api/v1/autopilot/logs').catch(() => null),
        ]);

        if (settingsRes?.ok) {
          const data = await settingsRes.json();
          setSettings({
            ...mockSettings,
            ...data,
          });
        } else {
          usingMock = true;
        }

        if (logsRes?.ok) {
          const data = await logsRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setLogs(data);
          } else {
            usingMock = true;
          }
        } else {
          usingMock = true;
        }
      } catch (err) {
        console.error('Failed to fetch autopilot data:', err);
        usingMock = true;
      }

      setIsUsingMockData(usingMock);
    }

    fetchData();
  }, []);

  // 自動關閉 toast
  useEffect(() => {
    if (saveToast) {
      const timer = setTimeout(() => setSaveToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetchWithAuth('/api/v1/autopilot/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveToast('設定已儲存');
      } else {
        setSaveToast('儲存失敗，請稍後再試');
      }
    } catch (err) {
      console.error('Failed to save autopilot settings:', err);
      setSaveToast('儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  const totalSavings = logs.reduce((sum, log) => sum + (log.savings || 0), 0);

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          🚗 自動駕駛
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          設定目標後，AI 會自動幫你優化廣告
        </p>
      </div>

      {/* 使用展示資料提示 */}
      {isUsingMockData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 text-sm text-amber-700 dark:text-amber-300">
          目前顯示的是展示資料。連接廣告帳號後將顯示真實數據。
        </div>
      )}

      {/* 儲存提示 */}
      {saveToast && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2 text-sm text-green-700 dark:text-green-300">
          {saveToast}
        </div>
      )}

      {/* 狀態卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">
              {settings.enabled ? '🟢' : '⚪'}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                狀態：{settings.enabled ? '運作中' : '未啟用'}
              </h2>
              {settings.enabled && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  已連續運作 15 天，幫你省下 ${totalSavings.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <Button
            variant={settings.enabled ? 'outline' : 'default'}
            onClick={() =>
              setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
          >
            {settings.enabled ? '暫停' : '啟用'}
          </Button>
        </div>
      </div>

      {/* 目標設定 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          🎯 目標設定
        </h2>

        <div className="space-y-6">
          {/* 目標類型 */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              目標類型
            </Label>
            <div className="space-y-2">
              {[
                { value: 'maximize_conversions', label: '最大化訂單數量' },
                { value: 'maximize_revenue', label: '最大化營收' },
                { value: 'minimize_cost', label: '控制成本為主' },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="goalType"
                    value={option.value}
                    checked={settings.goalType === option.value}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        goalType: e.target.value as AutopilotSettings['goalType'],
                      }))
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 每筆訂單成本上限 */}
          <div>
            <Label
              htmlFor="targetCpa"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
            >
              每筆訂單成本上限
            </Label>
            <div className="relative w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                NT$
              </span>
              <input
                id="targetCpa"
                type="number"
                value={settings.targetCpa || ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    targetCpa: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="500"
              />
            </div>
          </div>

          {/* 每月預算上限 */}
          <div>
            <Label
              htmlFor="monthlyBudget"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
            >
              每月預算上限
            </Label>
            <div className="relative w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                NT$
              </span>
              <input
                id="monthlyBudget"
                type="number"
                value={settings.monthlyBudget || ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    monthlyBudget: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="50000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 自動執行權限 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          ⚙️ 自動執行權限
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動暫停成本過高的廣告
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                當廣告成本超過目標 20% 連續 3 天
              </p>
            </div>
            <Switch
              checked={settings.autoPauseEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoPauseEnabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動暫停疲勞的素材
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                當素材點擊率連續下降 7 天
              </p>
            </div>
            <Switch
              checked={settings.autoFatigueEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoFatigueEnabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動調整預算分配
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                把預算從差的廣告移到好的廣告
              </p>
            </div>
            <Switch
              checked={settings.autoAdjustBudgetEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  autoAdjustBudgetEnabled: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動加碼表現好的廣告
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                當廣告投報率 &gt; 4 倍，自動增加 20% 預算
              </p>
            </div>
            <Switch
              checked={settings.autoBoostEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoBoostEnabled: checked }))
              }
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>
      </div>

      {/* 最近執行記錄 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📜 最近執行記錄
        </h2>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-24">
                  {log.date}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {log.action}
                </span>
              </div>
              <div>
                {log.savings && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    省下 ${log.savings.toLocaleString()}
                  </span>
                )}
                {log.earnings && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    預估多賺 ${log.earnings.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
