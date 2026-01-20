/**
 * Meta Marketing API OAuth 連接端點
 *
 * 代理請求到 Python 後端，產生 Meta OAuth 授權 URL
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染，因為此路由需要讀取 searchParams
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const redirectUri = searchParams.get('redirect_uri');

    // 取得前端傳入的 Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: '請先登入才能連接廣告帳戶' },
        { status: 401 }
      );
    }

    // 如果沒有提供 redirect_uri，使用預設值
    const finalRedirectUri =
      redirectUri || `${request.nextUrl.origin}/api/v1/accounts/callback/meta`;

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/meta/auth?redirect_uri=${encodeURIComponent(finalRedirectUri)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader, // 轉發認證 header 到後端
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // 確保錯誤訊息是字串，不是物件
      const errorMessage = typeof error.detail === 'string'
        ? error.detail
        : error.detail?.message || 'Failed to get auth URL';
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Meta OAuth connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
