import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/v1/auth/token-exchange
 *
 * 安全地將 OAuth 暫存 cookie 中的 token 返回給前端，並立即清除 cookie。
 *
 * 這個端點解決了 Google OAuth 回調中 token 不應出現在 URL 的安全問題：
 * 1. google/callback 將 token 存入短效 httpOnly cookie（60秒）
 * 2. 前端 /auth/callback 頁面呼叫此端點取得 token
 * 3. 此端點返回 token 並清除 cookie（一次性使用）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieValue = request.cookies.get('oauth_token_temp')?.value;

  if (!cookieValue) {
    return NextResponse.json(
      {
        error: {
          code: 'NO_PENDING_TOKEN',
          message: '無待處理的認證 token，請重新登入',
        },
      },
      { status: 401 }
    );
  }

  let tokenData: { access_token: string; user: object | null };
  try {
    tokenData = JSON.parse(cookieValue);
  } catch {
    const res = NextResponse.json(
      {
        error: {
          code: 'INVALID_TOKEN_DATA',
          message: '認證資料格式錯誤，請重新登入',
        },
      },
      { status: 401 }
    );
    // 清除損壞的 cookie
    res.cookies.delete('oauth_token_temp');
    return res;
  }

  // 返回 token 資料並立即清除 cookie（一次性使用）
  const res = NextResponse.json({
    success: true,
    data: {
      access_token: tokenData.access_token,
      user: tokenData.user,
    },
  });

  res.cookies.delete('oauth_token_temp');

  return res;
}
