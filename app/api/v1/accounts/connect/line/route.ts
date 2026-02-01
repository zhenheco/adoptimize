/**
 * LINE Ads 連接端點
 *
 * 代理請求到 Python 後端處理 LINE 帳號連接
 * LINE 使用 JWS 認證，需要用戶輸入 Access Key 和 Secret Key
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/line/connect`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to connect LINE account' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('LINE connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
