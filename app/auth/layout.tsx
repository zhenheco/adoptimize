/**
 * Auth 頁面 Layout
 *
 * 用於登入/註冊等認證相關頁面
 * 不包含側邊欄，使用置中卡片式設計
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {children}
    </div>
  );
}
