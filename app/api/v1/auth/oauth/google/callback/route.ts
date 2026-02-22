/**
 * Google OAuth 用戶登入回調端點
 *
 * 處理 Google OAuth 授權後的回調，
 * 代理請求到 Python 後端進行 token 交換和用戶登入
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染，因為此路由需要讀取 searchParams
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** 共用的安全 cookie 選項 */
const SECURE_COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
  path: '/',
};

function redirectToLogin(request: NextRequest, errorMessage: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 處理 OAuth 錯誤
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      return redirectToLogin(request, errorDescription);
    }

    if (!code) {
      return redirectToLogin(request, 'No authorization code received');
    }

    // 構建回調 URL 參數
    const params = new URLSearchParams();
    params.set('code', code);
    if (state) params.set('state', state);
    params.set('redirect_uri', `${request.nextUrl.origin}/api/v1/auth/oauth/google/callback`);

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/auth/oauth/google/callback?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || data.detail || 'OAuth callback failed';
      return redirectToLogin(request, errorMessage);
    }

    // 成功後將 token 資料暫存至短效 httpOnly cookie（60秒），不放入 URL
    // /auth/callback 頁面會透過 /api/v1/auth/token-exchange 安全取得 token
    const res = NextResponse.redirect(new URL('/auth/callback', request.url));

    // 暫存 access_token（60秒後自動過期）
    const tempPayload = JSON.stringify({
      access_token: data.data.access_token,
      user: data.data.user || null,
    });
    res.cookies.set('oauth_token_temp', tempPayload, {
      ...SECURE_COOKIE_BASE,
      maxAge: 60, // 60 秒，前端取得後立即清除
    });

    // 設置 httpOnly cookie 存儲 refresh token（用於 token 刷新）
    if (data.data?.refresh_token) {
      res.cookies.set('refresh_token', data.data.refresh_token, {
        ...SECURE_COOKIE_BASE,
        maxAge: 7 * 24 * 60 * 60, // 7 天
      });
    }

    return res;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return redirectToLogin(request, 'Internal server error');
  }
}
