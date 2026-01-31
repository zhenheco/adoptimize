/**
 * Reddit Ads OAuth 授權端點
 *
 * 代理請求到 Python 後端取得 OAuth 授權 URL
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // 構建回調 URL
    const origin = request.nextUrl.origin;
    const finalRedirectUri = `${origin}/api/v1/accounts/callback/reddit`;

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/reddit/auth?redirect_uri=${encodeURIComponent(finalRedirectUri)}`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to get auth URL' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reddit OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
