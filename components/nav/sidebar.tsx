'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Image,
  Users,
  HeartPulse,
  Zap,
  Settings,
  LogOut,
} from 'lucide-react';
import { RestartTourButton } from '@/components/onboarding';

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
 */
const navItems: NavItem[] = [
  { href: '/dashboard', label: '儀表板', icon: LayoutDashboard },
  { href: '/creatives', label: '素材管理', icon: Image },
  { href: '/audiences', label: '受眾分析', icon: Users },
  { href: '/health', label: '帳戶健檢', icon: HeartPulse },
  { href: '/actions', label: '行動中心', icon: Zap },
];

/**
 * 側邊欄元件
 * 提供主要導航功能
 */
export function Sidebar() {
  const pathname = usePathname();

  /**
   * 判斷導航項目是否為當前頁面
   */
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo 區域 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AO</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            AdOptimize
          </span>
        </Link>
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
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
          <LogOut className="w-5 h-5" />
          登出
        </button>
      </div>
    </aside>
  );
}
