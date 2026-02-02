import { redirect } from 'next/navigation';

/**
 * 錢包頁面
 *
 * 重定向到帳單頁面（儲值功能已整合在帳單頁面）
 */
export default function WalletPage() {
  redirect('/billing');
}
