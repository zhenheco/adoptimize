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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 處理 OAuth 錯誤
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      // 重定向到登入頁面並帶上錯誤訊息
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(errorDescription)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/login?error=No authorization code received', request.url)
      );
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
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

    // 成功後重定向到 callback 中間頁面，帶上 token
    // 這樣前端才能將 token 存入 localStorage
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.searchParams.set('access_token', data.data.access_token);

    // 如果有 user 資訊，也傳遞給前端
    if (data.data.user) {
      callbackUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(data.data.user)));
    }

    const res = NextResponse.redirect(callbackUrl);

    // 設置 httpOnly cookie 存儲 refresh token（用於 token 刷新）
    if (data.data?.refresh_token) {
      res.cookies.set('refresh_token', data.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 天
        path: '/',
      });
    }

    return res;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=Internal server error', request.url)
    );
  }
}
