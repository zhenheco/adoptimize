/**
 * 用戶註冊 API 代理
 *
 * POST /api/v1/auth/register
 * 代理到 Python 後端的 /api/v1/auth/register
 */

import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL =
  process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${PYTHON_API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[Auth Register] Error:', error)
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
