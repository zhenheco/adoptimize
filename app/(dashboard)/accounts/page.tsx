'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Link2,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';

/**
 * 帳戶狀態類型
 */
type AccountStatus = 'connected' | 'expired' | 'error';

/**
 * 帳戶資料介面
 */
interface AdAccount {
  id: string;
  platform: 'google' | 'meta';
  name: string;
  accountId: string;
  status: AccountStatus;
  lastSync: string;
}

/**
 * 模擬已連結帳戶資料
 * TODO: 從 API 獲取實際資料
 */
const mockAccounts: AdAccount[] = [
  {
    id: '1',
    platform: 'google',
    name: 'Google Ads - 主帳戶',
    accountId: '123-456-7890',
    status: 'connected',
    lastSync: '2024-12-31T10:30:00Z',
  },
  {
    id: '2',
    platform: 'meta',
    name: 'Meta Business - 電商廣告',
    accountId: 'act_1234567890',
    status: 'connected',
    lastSync: '2024-12-31T09:15:00Z',
  },
];

/**
 * 帳戶卡片元件
 */
interface AccountCardProps {
  account: AdAccount;
  onRefresh: (id: string) => void;
  onDisconnect: (id: string) => void;
}

function AccountCard({ account, onRefresh, onDisconnect }: AccountCardProps) {
  const platformStyles = {
    google: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      label: 'Google Ads',
    },
    meta: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'Meta Ads',
    },
  };

  const style = platformStyles[account.platform];

  const statusConfig = {
    connected: {
      icon: <Check className="w-4 h-4" />,
      label: '已連結',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    expired: {
      icon: <Clock className="w-4 h-4" />,
      label: '授權過期',
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: '連線錯誤',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  };

  const status = statusConfig[account.status];

  const formatLastSync = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* 平台圖示 */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg}`}
            >
              <span className={`font-bold text-lg ${style.text}`}>
                {account.platform === 'google' ? 'G' : 'M'}
              </span>
            </div>

            {/* 帳戶資訊 */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {account.name}
                </h3>
                <Badge className={status.className}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {style.label} • {account.accountId}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                最後同步: {formatLastSync(account.lastSync)}
              </p>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRefresh(account.id)}
              title="立即同步"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDisconnect(account.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              title="中斷連結"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 帳戶管理內容元件
 *
 * 功能：
 * - 顯示已連結帳戶列表
 * - 處理 OAuth callback 狀態訊息
 * - 連結新帳戶
 * - 同步/中斷連結操作
 */
function AccountsContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<AdAccount[]>(mockAccounts);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // 處理 OAuth callback query params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const accountId = searchParams.get('account_id');

    if (success) {
      const platform = success === 'google' ? 'Google Ads' : 'Meta Ads';
      setToast({
        type: 'success',
        message: `成功連結 ${platform} 帳戶${accountId ? ` (${accountId})` : ''}`,
      });
    } else if (error) {
      setToast({
        type: 'error',
        message: `連結失敗: ${decodeURIComponent(error)}`,
      });
    }

    // 3 秒後自動關閉 toast
    if (success || error) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  /**
   * 連結 Google Ads 帳戶
   */
  const handleConnectGoogle = () => {
    window.location.href = '/api/v1/accounts/connect/google';
  };

  /**
   * 連結 Meta 帳戶
   */
  const handleConnectMeta = () => {
    window.location.href = '/api/v1/accounts/connect/meta';
  };

  /**
   * 同步帳戶資料
   */
  const handleRefresh = (id: string) => {
    console.log('Refreshing account:', id);
    // TODO: 呼叫 API 觸發同步
    setToast({
      type: 'success',
      message: '已觸發資料同步，請稍候...',
    });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * 中斷帳戶連結
   */
  const handleDisconnect = (id: string) => {
    // TODO: 呼叫 API 中斷連結
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setToast({
      type: 'success',
      message: '已中斷帳戶連結',
    });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast 通知 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-1 hover:bg-black/10 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            帳戶管理
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            管理您連結的廣告平台帳戶
          </p>
        </div>
      </div>

      {/* 連結新帳戶區塊 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">連結新帳戶</CardTitle>
              <CardDescription>
                連結您的 Google Ads 或 Meta 廣告帳戶以開始優化
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={handleConnectGoogle} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 Google Ads
            </Button>
            <Button onClick={handleConnectMeta} variant="outline" className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 Meta Ads
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 已連結帳戶列表 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            已連結帳戶
          </h2>
          <Badge variant="secondary">{accounts.length}</Badge>
        </div>

        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onRefresh={handleRefresh}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Link2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                尚未連結任何帳戶
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                連結您的廣告帳戶以開始使用 AdOptimize
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * 帳戶管理頁面
 *
 * 使用 Suspense 包裹 AccountsContent 以支援 useSearchParams
 */
export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}
