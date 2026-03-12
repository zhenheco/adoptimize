"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  ExternalLink,
  Clock,
  Lock,
} from "lucide-react";

/**
 * 帳戶狀態類型
 */
type AccountStatus = "connected" | "expired" | "error";

/**
 * 帳戶資料介面
 */
interface AdAccount {
  id: string;
  platform: "google" | "meta" | "tiktok" | "reddit" | "linkedin" | "pinterest";
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
  statusLabels: Record<AccountStatus, string>;
  syncNowLabel: string;
  disconnectLabel: string;
  lastSyncLabel: string;
}

function AccountCard({ account, onRefresh, onDisconnect, statusLabels, syncNowLabel, disconnectLabel, lastSyncLabel }: AccountCardProps) {
  const platformStyles = {
    google: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-600 dark:text-red-400",
      label: "Google Ads",
      icon: "G",
    },
    meta: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      label: "Meta Ads",
      icon: "M",
    },
    tiktok: {
      bg: "bg-gray-900 dark:bg-gray-800",
      text: "text-white dark:text-gray-100",
      label: "TikTok Ads",
      icon: "T",
    },
    reddit: {
      bg: "bg-orange-600 dark:bg-orange-700",
      text: "text-white dark:text-gray-100",
      label: "Reddit Ads",
      icon: "R",
    },
    linkedin: {
      bg: "bg-blue-700 dark:bg-blue-800",
      text: "text-white dark:text-gray-100",
      label: "LinkedIn Ads",
      icon: "in",
    },
    pinterest: {
      bg: "bg-red-600 dark:bg-red-700",
      text: "text-white dark:text-gray-100",
      label: "Pinterest Ads",
      icon: "P",
    },
  };

  const style = platformStyles[account.platform];

  const statusConfig = {
    connected: {
      icon: <Check className="w-4 h-4" />,
      label: statusLabels.connected,
      variant: "default" as const,
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    expired: {
      icon: <Clock className="w-4 h-4" />,
      label: statusLabels.expired,
      variant: "secondary" as const,
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: statusLabels.error,
      variant: "destructive" as const,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const status = statusConfig[account.status];

  const formatLastSync = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
                {lastSyncLabel}: {formatLastSync(account.lastSync)}
              </p>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRefresh(account.id)}
              title={syncNowLabel}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDisconnect(account.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              title={disconnectLabel}
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
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // 從 API 獲取帳戶列表
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch("/api/v1/accounts", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const result = await response.json();
          // 轉換 API 格式為前端格式
          const apiAccounts = (result.data || []).map(
            (acc: {
              id: string;
              platform: string;
              name: string;
              external_id: string;
              status: string;
              last_synced_at: string;
            }) => ({
              id: acc.id,
              platform: acc.platform as
                | "google"
                | "meta"
                | "tiktok"
                | "reddit"
                | "linkedin"
                | "pinterest",
              name: acc.name,
              accountId: acc.external_id,
              status:
                acc.status === "active"
                  ? "connected"
                  : (acc.status as AccountStatus),
              lastSync: acc.last_synced_at || new Date().toISOString(),
            }),
          );
          setAccounts(apiAccounts);
        }
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  // 處理 OAuth callback query params
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const accountId = searchParams.get("account_id");

    if (success) {
      const platformNames: Record<string, string> = {
        google: "Google Ads",
        meta: "Meta Ads",
        tiktok: "TikTok Ads",
        reddit: "Reddit Ads",
        linkedin: "LinkedIn Ads",
        pinterest: "Pinterest Ads",
      };
      const platform = platformNames[success] || success;
      setToast({
        type: "success",
        message: t('successConnect', { platform, accountId: accountId ? ` (${accountId})` : "" }),
      });
    } else if (error) {
      setToast({
        type: "error",
        message: t('failConnect', { error: decodeURIComponent(error) }),
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
    if (isConnecting) return;
    setIsConnecting("google");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setToast({ type: "error", message: tc('loginRequired') });
        return;
      }
      const response = await fetch("/api/v1/accounts/connect/google", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
      } else {
        const error = await response.json();
        const errorMsg =
          typeof error.error === "string"
            ? error.error
            : error.error?.message || tc('cannotGetAuthLink');
        setToast({ type: "error", message: errorMsg });
      }
    } catch (error) {
      console.error("Connect Google error:", error);
      setToast({ type: "error", message: tc('connectFailed') });
    } finally {
      setIsConnecting(null);
    }
  };

  /**
   * 連結 Meta 帳戶
   */
  const handleConnectMeta = async () => {
    if (isConnecting) return;
    setIsConnecting("meta");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setToast({ type: "error", message: tc('loginRequired') });
        return;
      }
      const response = await fetch("/api/v1/accounts/connect/meta", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
      } else {
        const error = await response.json();
        const errorMsg =
          typeof error.error === "string"
            ? error.error
            : error.error?.message || tc('cannotGetAuthLink');
        setToast({ type: "error", message: errorMsg });
      }
    } catch (error) {
      console.error("Connect Meta error:", error);
      setToast({ type: "error", message: tc('connectFailed') });
    } finally {
      setIsConnecting(null);
    }
  };

  /**
   * 同步帳戶資料
   */
  const handleRefresh = (id: string) => {
    console.log("Refreshing account:", id);
    // TODO: 呼叫 API 觸發同步
    setToast({
      type: "success",
      message: t('syncTriggered'),
    });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * 中斷帳戶連結
   */
  const handleDisconnect = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/v1/accounts/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`${t('disconnectFailed')}: ${response.status}`);
      }

      // API 成功後才更新 UI
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setToast({
        type: "success",
        message: t('disconnected'),
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : t('disconnectFailed'),
      });
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast 通知 */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200"
              : "bg-red-50 text-red-800 dark:bg-red-900/50 dark:text-red-200"
          }`}
        >
          {toast.type === "success" ? (
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
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
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
              <CardTitle className="text-lg">{t('connectNew')}</CardTitle>
              <CardDescription>
                {t('connectNewDesc')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleConnectGoogle}
              disabled={isConnecting !== null}
              className="flex-1 min-w-[150px]"
            >
              {isConnecting === "google" ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {t('connectGoogle')}
            </Button>
            <Button
              onClick={handleConnectMeta}
              disabled={isConnecting !== null}
              variant="outline"
              className="flex-1 min-w-[150px]"
            >
              {isConnecting === "meta" ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {t('connectMeta')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { label: "TikTok Ads", color: "bg-gray-800" },
              { label: "Reddit Ads", color: "bg-orange-600" },
              { label: "LinkedIn Ads", color: "bg-blue-700" },
              { label: "Pinterest Ads", color: "bg-red-600" },
            ].map((platform) => (
              <div
                key={platform.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-400">{platform.label}</span>
                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                  {tc('comingSoon')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 已連結帳戶列表 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('connectedAccounts')}
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
                statusLabels={{
                  connected: tc('connected'),
                  expired: tc('expired'),
                  error: tc('connectionError'),
                }}
                syncNowLabel={tc('syncNow')}
                disconnectLabel={tc('disconnect')}
                lastSyncLabel={tc('lastSync')}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Link2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('noAccounts')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('noAccountsDesc')}
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
