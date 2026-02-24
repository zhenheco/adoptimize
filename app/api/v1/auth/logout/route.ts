/**
 * 用戶登出 API
 *
 * POST /api/v1/auth/logout
 * 清除 httpOnly refresh_token cookie
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json(
    { success: true, message: '已登出' },
    { status: 200 }
  );

  res.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return res;
}
