import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdOptimize - 跨平台廣告優化工具',
  description: '整合 Google Ads 和 Meta Marketing API 的智慧廣告優化平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="font-sans">{children}</body>
    </html>
  );
}
