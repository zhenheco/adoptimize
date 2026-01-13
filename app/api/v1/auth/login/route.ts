/**
 * 用戶登入 API 代理
 *
 * POST /api/v1/auth/login
 * 代理到 Python 後端的 /api/v1/auth/login
 */

import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL =
  process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${PYTHON_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    // 設置 httpOnly cookie 存儲 refresh token（更安全）
    const res = NextResponse.json(data, { status: response.status })

    if (response.ok && data.data?.refresh_token) {
      res.cookies.set('refresh_token', data.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 天
        path: '/',
      })
    }

    return res
  } catch (error) {
    console.error('[Auth Login] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: '無法連接到後端服務',
        },
      },
      { status: 503 }
    )
  }
}
