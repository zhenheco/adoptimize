/**
 * Google Ads OAuth 連接端點
 *
 * 代理請求到 Python 後端，產生 Google OAuth 授權 URL
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染，因為此路由需要讀取 searchParams
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const redirectUri = searchParams.get('redirect_uri');

    // 如果沒有提供 redirect_uri，使用預設值
    const finalRedirectUri =
      redirectUri || `${request.nextUrl.origin}/api/v1/accounts/callback/google`;

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/google/auth?redirect_uri=${encodeURIComponent(finalRedirectUri)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Failed to get auth URL' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Google OAuth connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
