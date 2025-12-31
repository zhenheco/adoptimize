import { redirect } from 'next/navigation';

/**
 * 儀表板路由群組根頁面
 *
 * 這個頁面位於 (dashboard) 路由群組的根目錄，
 * 但由於 app/page.tsx 已經處理 / 路由，
 * 這個頁面實際上不會被訪問。
 *
 * 如果意外訪問到此頁面，重定向到 /dashboard
 */
export default function DashboardGroupRootPage() {
  redirect('/dashboard');
}
