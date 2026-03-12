'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RestartTourButton } from '@/components/onboarding';
import { useAccounts } from '@/hooks/use-accounts';
import {
  Link2,
  Bell,
  RefreshCw,
  Download,
  HelpCircle,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
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
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  // 獲取已連結的帳戶
  const { accounts, isLoading: isLoadingAccounts, error: accountsError } = useAccounts();

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
  const formatLastSync = (isoString: string | undefined) => {
    if (!isoString) return tc('notSynced');
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* 1. 帳戶連結區塊 */}
      <SettingsSection
        icon={<Link2 className="w-5 h-5" />}
        title={t('accountLinks')}
        description={t('accountLinksDesc')}
      >
        <div className="space-y-4">
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">{t('loadingAccounts')}</span>
            </div>
          ) : accountsError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400">
                {t('loadAccountError')}
              </p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <Link2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('noAccountsLinked')}
              </p>
              <Link href="/accounts">
                <Button variant="default" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('linkAccount')}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {accounts.map((account) => (
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
                        {tc('lastSync')}: {formatLastSync(account.last_sync_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {account.status === 'active' ? (
                      <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        {tc('connected')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="w-4 h-4" />
                        {account.status === 'paused' ? tc('paused') : tc('needReauth')}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <Link href="/accounts">
                <Button variant="outline" className="w-full mt-2">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('manageAccounts')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </SettingsSection>

      {/* 2. 通知設定區塊 */}
      <SettingsSection
        icon={<Bell className="w-5 h-5" />}
        title={t('notifications')}
        description={t('notificationsDesc')}
      >
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <SettingItem
            label={t('fatigueAlert')}
            description={t('fatigueAlertDesc')}
            checked={notifications.fatigueAlert}
            onCheckedChange={(checked) =>
              setNotifications((prev) => ({ ...prev, fatigueAlert: checked }))
            }
          />
          <SettingItem
            label={t('healthDrop')}
            description={t('healthDropDesc')}
            checked={notifications.healthDrop}
            onCheckedChange={(checked) =>
              setNotifications((prev) => ({ ...prev, healthDrop: checked }))
            }
          />
          <SettingItem
            label={t('recommendations')}
            description={t('recommendationsDesc')}
            checked={notifications.recommendations}
            onCheckedChange={(checked) =>
              setNotifications((prev) => ({ ...prev, recommendations: checked }))
            }
          />
          <SettingItem
            label={t('weeklyReport')}
            description={t('weeklyReportDesc')}
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
        title={t('syncFrequency')}
        description={t('syncFrequencyDesc')}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{t('autoSyncInterval')}</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('autoSyncIntervalDesc')}
            </p>
          </div>
          <Select value={syncFrequency} onValueChange={setSyncFrequency}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">{t('minutes15')}</SelectItem>
              <SelectItem value="30">{t('minutes30')}</SelectItem>
              <SelectItem value="60">{t('hour1')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>

      {/* 4. 資料匯出區塊 */}
      <SettingsSection
        icon={<Download className="w-5 h-5" />}
        title={t('dataExport')}
        description={t('dataExportDesc')}
      >
        <div className="flex gap-3">
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" />
            {t('exportCSV')}
          </Button>
          <Button variant="outline" disabled>
            <Download className="w-4 h-4 mr-2" />
            {t('exportPDF')}
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400 self-center ml-2">
            {tc('comingSoon')}
          </span>
        </div>
      </SettingsSection>

      {/* 5. 導覽設定區塊 */}
      <SettingsSection
        icon={<HelpCircle className="w-5 h-5" />}
        title={t('tourSettings')}
        description={t('tourSettingsDesc')}
      >
        <div className="flex items-center gap-4">
          <RestartTourButton />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('tourHint')}
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}
