/**
 * Token 刷新 API 代理
 *
 * POST /api/v1/auth/refresh
 * 代理到 Python 後端的 /api/v1/auth/refresh
 */

import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL =
  process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // 從 cookie 或 body 取得 refresh token
    const refreshTokenFromCookie = request.cookies.get('refresh_token')?.value
    const body = await request.json().catch(() => ({}))

    const refreshToken = body.refresh_token || refreshTokenFromCookie

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: '缺少 refresh token',
          },
        },
        { status: 401 }
      )
    }

    const response = await fetch(`${PYTHON_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Auth Refresh] Error:', error)
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
