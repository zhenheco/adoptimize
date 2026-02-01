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
  platform: 'google' | 'meta' | 'tiktok' | 'reddit' | 'line' | 'linkedin';
  name: string;
  accountId: string;
  status: AccountStatus;
  lastSync: string;
}


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
      icon: 'G',
    },
    meta: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      label: 'Meta Ads',
      icon: 'M',
    },
    tiktok: {
      bg: 'bg-gray-900 dark:bg-gray-800',
      text: 'text-white dark:text-gray-100',
      label: 'TikTok Ads',
      icon: 'T',
    },
    reddit: {
      bg: 'bg-orange-600 dark:bg-orange-700',
      text: 'text-white dark:text-gray-100',
      label: 'Reddit Ads',
      icon: 'R',
    },
    line: {
      bg: 'bg-green-500 dark:bg-green-600',
      text: 'text-white dark:text-gray-100',
      label: 'LINE Ads',
      icon: 'L',
    },
    linkedin: {
      bg: 'bg-blue-700 dark:bg-blue-800',
      text: 'text-white dark:text-gray-100',
      label: 'LinkedIn Ads',
      icon: 'in',
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
                {style.icon}
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
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // LINE 連接表單狀態
  const [showLineForm, setShowLineForm] = useState(false);
  const [lineCredentials, setLineCredentials] = useState({
    accessKey: '',
    secretKey: '',
    adAccountId: '',
  });
  const [isConnectingLine, setIsConnectingLine] = useState(false);

  // 從 API 獲取帳戶列表
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/v1/accounts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const result = await response.json();
          // 轉換 API 格式為前端格式
          const apiAccounts = (result.data || []).map((acc: {
            id: string;
            platform: string;
            name: string;
            external_id: string;
            status: string;
            last_synced_at: string;
          }) => ({
            id: acc.id,
            platform: acc.platform as 'google' | 'meta' | 'tiktok' | 'reddit' | 'line' | 'linkedin',
            name: acc.name,
            accountId: acc.external_id,
            status: acc.status === 'active' ? 'connected' : acc.status as AccountStatus,
            lastSync: acc.last_synced_at || new Date().toISOString(),
          }));
          setAccounts(apiAccounts);
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  // 處理 OAuth callback query params
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const accountId = searchParams.get('account_id');

    if (success) {
      const platformNames: Record<string, string> = {
        google: 'Google Ads',
        meta: 'Meta Ads',
        tiktok: 'TikTok Ads',
        reddit: 'Reddit Ads',
        line: 'LINE Ads',
        linkedin: 'LinkedIn Ads',
      };
      const platform = platformNames[success] || success;
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
  const handleConnectGoogle = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setToast({ type: 'error', message: '請先登入才能連接廣告帳戶' });
        return;
      }
      const response = await fetch('/api/v1/accounts/connect/google', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      } else {
        const error = await response.json();
        // 確保錯誤訊息是字串，不是物件
        const errorMsg = typeof error.error === 'string'
          ? error.error
          : error.error?.message || '無法取得授權連結';
        setToast({ type: 'error', message: errorMsg });
      }
    } catch (error) {
      console.error('Connect Google error:', error);
      setToast({ type: 'error', message: '連接失敗，請稍後再試' });
    }
  };

  /**
   * 連結 Meta 帳戶
   */
  const handleConnectMeta = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setToast({ type: 'error', message: '請先登入才能連接廣告帳戶' });
        return;
      }
      const response = await fetch('/api/v1/accounts/connect/meta', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      } else {
        const error = await response.json();
        // 確保錯誤訊息是字串，不是物件
        const errorMsg = typeof error.error === 'string'
          ? error.error
          : error.error?.message || '無法取得授權連結';
        setToast({ type: 'error', message: errorMsg });
      }
    } catch (error) {
      console.error('Connect Meta error:', error);
      setToast({ type: 'error', message: '連接失敗，請稍後再試' });
    }
  };

  /**
   * 連結 TikTok 帳戶
   */
  const handleConnectTikTok = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setToast({ type: 'error', message: '請先登入才能連接廣告帳戶' });
        return;
      }
      const response = await fetch('/api/v1/accounts/connect/tiktok', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      } else {
        const error = await response.json();
        const errorMsg = typeof error.error === 'string'
          ? error.error
          : error.error?.message || '無法取得授權連結';
        setToast({ type: 'error', message: errorMsg });
      }
    } catch (error) {
      console.error('Connect TikTok error:', error);
      setToast({ type: 'error', message: '連接失敗，請稍後再試' });
    }
  };

  /**
   * 連結 Reddit 帳戶
   */
  const handleConnectReddit = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setToast({ type: 'error', message: '請先登入才能連接廣告帳戶' });
        return;
      }
      const response = await fetch('/api/v1/accounts/connect/reddit', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      } else {
        const error = await response.json();
        const errorMsg = typeof error.error === 'string'
          ? error.error
          : error.error?.message || '無法取得授權連結';
        setToast({ type: 'error', message: errorMsg });
      }
    } catch (error) {
      console.error('Connect Reddit error:', error);
      setToast({ type: 'error', message: '連接失敗，請稍後再試' });
    }
  };

  /**
   * 連結 LinkedIn 帳戶
   */
  const handleConnectLinkedIn = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setToast({ type: 'error', message: '請先登入才能連接廣告帳戶' });
        return;
      }
      const response = await fetch('/api/v1/accounts/connect/linkedin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      } else {
        const error = await response.json();
        const errorMsg = typeof error.error === 'string'
          ? error.error
          : error.error?.message || '無法取得授權連結';
        setToast({ type: 'error', message: errorMsg });
      }
    } catch (error) {
      console.error('Connect LinkedIn error:', error);
      setToast({ type: 'error', message: '連接失敗，請稍後再試' });
    }
  };

  /**
   * 連結 LINE 帳戶（需要表單輸入）
   */
  const handleConnectLine = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setToast({ type: 'error', message: '請先登入才能連接廣告帳戶' });
      return;
    }

    if (!lineCredentials.accessKey || !lineCredentials.secretKey || !lineCredentials.adAccountId) {
      setToast({ type: 'error', message: '請填寫所有 LINE Ads 憑證欄位' });
      return;
    }

    setIsConnectingLine(true);
    try {
      const response = await fetch('/api/v1/accounts/connect/line', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: lineCredentials.accessKey,
          secret_key: lineCredentials.secretKey,
          ad_account_id: lineCredentials.adAccountId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToast({ type: 'success', message: '成功連結 LINE Ads 帳戶' });
        setShowLineForm(false);
        setLineCredentials({ accessKey: '', secretKey: '', adAccountId: '' });
        // 重新載入帳戶列表
        window.location.reload();
      } else {
        setToast({
          type: 'error',
          message: data.error || '連接 LINE Ads 失敗',
        });
      }
    } catch (error) {
      console.error('Connect LINE error:', error);
      setToast({ type: 'error', message: '連接失敗，請稍後再試' });
    } finally {
      setIsConnectingLine(false);
    }
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
                連結您的 Google Ads、Meta、TikTok、Reddit 或 LinkedIn 廣告帳戶以開始優化
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleConnectGoogle} className="flex-1 min-w-[150px]">
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 Google Ads
            </Button>
            <Button onClick={handleConnectMeta} variant="outline" className="flex-1 min-w-[150px]">
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 Meta Ads
            </Button>
            <Button
              onClick={handleConnectTikTok}
              variant="outline"
              className="flex-1 min-w-[150px] bg-gray-900 text-white hover:bg-gray-800 border-gray-900"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 TikTok Ads
            </Button>
            <Button
              onClick={handleConnectReddit}
              variant="outline"
              className="flex-1 min-w-[150px] bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 Reddit Ads
            </Button>
            <Button
              onClick={() => setShowLineForm(!showLineForm)}
              variant="outline"
              className="flex-1 min-w-[150px] bg-green-500 text-white hover:bg-green-600 border-green-500"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 LINE Ads
            </Button>
            <Button
              onClick={handleConnectLinkedIn}
              variant="outline"
              className="flex-1 min-w-[150px] bg-blue-700 text-white hover:bg-blue-800 border-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              連結 LinkedIn Ads
            </Button>
          </div>

          {/* LINE 連接表單 */}
          {showLineForm && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">
                輸入 LINE Ads 憑證
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                請從 LINE Ads Platform 後台取得 Access Key 和 Secret Key
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Access Key
                  </label>
                  <input
                    type="text"
                    value={lineCredentials.accessKey}
                    onChange={(e) =>
                      setLineCredentials({ ...lineCredentials, accessKey: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="輸入 Access Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={lineCredentials.secretKey}
                    onChange={(e) =>
                      setLineCredentials({ ...lineCredentials, secretKey: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="輸入 Secret Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    廣告帳號 ID
                  </label>
                  <input
                    type="text"
                    value={lineCredentials.adAccountId}
                    onChange={(e) =>
                      setLineCredentials({ ...lineCredentials, adAccountId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="輸入廣告帳號 ID"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleConnectLine}
                    disabled={isConnectingLine}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {isConnectingLine ? '連接中...' : '連接帳號'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLineForm(false);
                      setLineCredentials({ accessKey: '', secretKey: '', adAccountId: '' });
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </div>
          )}
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
                連結您的廣告帳戶以開始使用 廣告船長
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
