/**
 * Reddit Ads OAuth 回調端點
 *
 * 處理 Reddit OAuth 授權後的回調，
 * 代理請求到 Python 後端進行 token 交換
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
      // 重定向到前端錯誤頁面
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(errorDescription)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/accounts?error=No authorization code received', request.url)
      );
    }

    // 構建回調 URL 參數
    const params = new URLSearchParams();
    params.set('code', code);
    if (state) params.set('state', state);
    params.set('redirect_uri', `${request.nextUrl.origin}/api/v1/accounts/callback/reddit`);

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/reddit/callback?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || data.detail || 'Reddit OAuth callback failed';
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

    // 成功後重定向到帳戶頁面
    return NextResponse.redirect(
      new URL(`/accounts?success=reddit&account_id=${data.account_id}`, request.url)
    );
  } catch (error) {
    console.error('Reddit OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=Internal server error', request.url)
    );
  }
}
