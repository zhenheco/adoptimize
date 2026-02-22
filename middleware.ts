import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware - 路由保護
 *
 * 檢查 httpOnly refresh_token cookie 是否存在，
 * 以判斷用戶是否已登入。
 *
 * 注意：access_token 儲存在 localStorage（客戶端），middleware 無法讀取。
 * 以 refresh_token cookie 作為「已登入」的代理判斷，
 * 實際 API 呼叫仍由後端 JWT 驗證進行真正的授權控制。
 */

/** 需要登入才能訪問的路由前綴 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/accounts',
  '/settings',
  '/billing',
  '/suggestions',
  '/recommendations',
  '/history',
  '/analytics',
  '/creatives',
];

/** 登入後不應再訪問的路由（會被重定向到 dashboard） */
const AUTH_ONLY_PATHS = [
  '/auth/login',
  '/auth/register',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const isLoggedIn = !!refreshToken;

  // 已登入的用戶訪問登入/註冊頁面 → 重定向到 dashboard
  if (isLoggedIn && AUTH_ONLY_PATHS.some((path) => pathname === path)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 未登入的用戶訪問受保護路由 → 重定向到登入頁面
  if (!isLoggedIn && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 排除靜態資源、圖片優化、API 路由（API 自行處理認證）
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
