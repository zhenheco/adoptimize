'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RestartTourButton } from '@/components/onboarding';
import {
  Link2,
  Bell,
  RefreshCw,
  Download,
  HelpCircle,
  ExternalLink,
  Check,
  AlertCircle,
} from 'lucide-react';

/**
 * 設定區塊元件
 * 用於包裝每個設定項目
 */
interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * 設定項目元件
 * 用於顯示單一設定開關
 */
interface SettingItemProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingItem({ label, description, checked, onCheckedChange }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/**
 * 模擬已連結帳戶資料
 * TODO: 從 API 獲取實際資料
 */
const mockAccounts = [
  {
    id: '1',
    platform: 'google',
    name: 'Google Ads - 主帳戶',
    status: 'connected' as const,
    lastSync: '2024-12-31T10:30:00Z',
  },
  {
    id: '2',
    platform: 'meta',
    name: 'Meta Business - 電商廣告',
    status: 'connected' as const,
    lastSync: '2024-12-31T09:15:00Z',
  },
];

/**
 * 設定頁面
 *
 * 包含以下設定區塊：
 * 1. 帳戶連結 - 已連結的廣告帳戶管理
 * 2. 通知設定 - 各類通知開關
 * 3. 同步頻率 - 資料同步間隔設定
 * 4. 資料匯出 - CSV/PDF 匯出選項
 * 5. 導覽設定 - 重新觀看導覽
 *
 * 註：主題切換功能已移至側邊欄 Logo 旁
 */
export default function SettingsPage() {
  // 通知設定狀態
  const [notifications, setNotifications] = useState({
    fatigueAlert: true,
    healthDrop: true,
    recommendations: true,
    weeklyReport: false,
  });

  // 同步頻率狀態
  const [syncFrequency, setSyncFrequency] = useState('15');

  /**
   * 格式化最後同步時間
   */
  const formatLastSync = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">設定</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          管理您的帳戶、通知和系統偏好設定
        </p>
      </div>

      {/* 1. 帳戶連結區塊 */}
      <SettingsSection
        icon={<Link2 className="w-5 h-5" />}
        title="帳戶連結"
        description="管理已連結的廣告平台帳戶"
      >
        <div className="space-y-4">
          {mockAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    account.platform === 'google'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}
                >
                  {account.platform === 'google' ? 'G' : 'M'}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {account.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    最後同步: {formatLastSync(account.lastSync)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {account.status === 'connected' ? (
                  <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    已連結
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="w-4 h-4" />
                    需重新授權
                  </span>
                )}
              </div>
            </div>
          ))}

          <Link href="/accounts">
            <Button variant="outline" className="w-full mt-2">
              <ExternalLink className="w-4 h-4 mr-2" />
              管理帳戶
            </Button>
          </Link>
        </div>
      </SettingsSection>

      {/* 2. 通知設定區塊 */}
      <SettingsSection
        icon={<Bell className="w-5 h-5" />}
        title="通知設定"
        description="設定您想要接收的通知類型"
      >
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <SettingItem
            label="素材疲勞警告"
            description="當素材疲勞度超過 70% 時通知"
            checked={notifications.fatigueAlert}
            onCheckedChange={(checked) =>
              setNotifications((prev) => ({ ...prev, fatigueAlert: checked }))
            }
          />
          <SettingItem
            label="健康分數下降"
            description="當帳戶健康分數下降超過 10 分時通知"
            checked={notifications.healthDrop}
            onCheckedChange={(checked) =>
              setNotifications((prev) => ({ ...prev, healthDrop: checked }))
            }
          />
          <SettingItem
            label="優化建議"
            description="有新的優化建議時通知"
            checked={notifications.recommendations}
            onCheckedChange={(checked) =>
              setNotifications((prev) => ({ ...prev, recommendations: checked }))
            }
          />
          <SettingItem
            label="每週報告"
            description="每週一發送效能摘要報告"
            checked={notifications.weeklyReport}
            onCheckedChange={(checked) =>
              setNotifications((prev) => ({ ...prev, weeklyReport: checked }))
            }
          />
        </div>
      </SettingsSection>

      {/* 3. 同步頻率區塊 */}
      <SettingsSection
        icon={<RefreshCw className="w-5 h-5" />}
        title="同步頻率"
        description="設定資料自動同步的時間間隔"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">自動同步間隔</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              系統會按此頻率從廣告平台同步最新數據
            </p>
          </div>
          <Select value={syncFrequency} onValueChange={setSyncFrequency}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 分鐘</SelectItem>
              <SelectItem value="30">30 分鐘</SelectItem>
              <SelectItem value="60">1 小時</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      {/* 4. 資料匯出區塊 */}
      <SettingsSection
        icon={<Download className="w-5 h-5" />}
        title="資料匯出"
        description="匯出您的廣告數據報告"
      >
        <div className="flex gap-3">
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" />
            匯出 CSV
          </Button>
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" />
            匯出 PDF
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center ml-2">
            即將推出
          </span>
        </div>
      </SettingsSection>

      {/* 5. 導覽設定區塊 */}
      <SettingsSection
        icon={<HelpCircle className="w-5 h-5" />}
        title="導覽設定"
        description="重新觀看產品導覽教學"
      >
        <div className="flex items-center gap-4">
          <RestartTourButton />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            點擊按鈕重新啟動新手導覽，了解各項功能
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}
