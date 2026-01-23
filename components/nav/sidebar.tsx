'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Car,
  Sparkles,
  FileText,
  Link2,
  Settings,
  LogOut,
  Sun,
  Moon,
  Ship,
} from 'lucide-react';
import { RestartTourButton } from '@/components/onboarding';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';

/**
 * 導航項目介面
 */
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * 側邊欄導航項目
 *
 * SDD v2.0: 簡化導航，聚焦自動駕駛和 AI 創作
 */
const navItems: NavItem[] = [
  { href: '/dashboard', label: '首頁', icon: LayoutDashboard },
  { href: '/autopilot', label: '自動駕駛', icon: Car },
  { href: '/ai-studio', label: 'AI 創作', icon: Sparkles },
  { href: '/reports', label: '報告', icon: FileText },
  { href: '/accounts', label: '帳號連接', icon: Link2 },
];

/**
 * 側邊欄元件
 * 提供主要導航功能
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { userEmail, clearUser } = useUser();

  /**
   * 判斷導航項目是否為當前頁面
   */
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  /**
   * 切換深淺色主題
   */
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  /**
   * 登出功能
   */
  const handleLogout = () => {
    // 清除 localStorage 中的 token 和 user
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    clearUser();
    // 導向登入頁面
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo 區域 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              廣告船長
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
            title={theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">切換主題</span>
          </Button>
        </div>
      </div>

      {/* 導航項目 */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 底部操作區域 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <RestartTourButton />
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
          設定
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          登出
        </button>
      </div>

      {/* 用戶資訊 */}
      {userEmail && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={userEmail}>
            {userEmail}
          </p>
        </div>
      )}
    </aside>
  );
}
