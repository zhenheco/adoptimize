/**
 * Meta OAuth SDK 登入端點
 *
 * 接收從 Facebook JavaScript SDK 獲取的 access token，
 * 代理到 Python 後端進行驗證和用戶登入
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token } = body;

    if (!access_token) {
      return NextResponse.json(
        { error: '缺少 access_token' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/auth/oauth/meta/sdk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || data.detail || 'SDK OAuth failed';
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // 成功後返回數據
    const res = NextResponse.json(data);

    // 設置 httpOnly cookie 存儲 refresh token
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
    console.error('Meta SDK OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
