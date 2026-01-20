/**
 * Google OAuth 用戶登入端點
 *
 * 產生 Google OAuth 授權 URL，供用戶登入使用
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染，因為此路由需要讀取 searchParams
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // 構建回調 URI（使用當前請求的 origin）
    const redirectUri = `${request.nextUrl.origin}/api/v1/auth/oauth/google/callback`;

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/auth/oauth/google?redirect_uri=${encodeURIComponent(redirectUri)}`,
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
    console.error('Google OAuth login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
