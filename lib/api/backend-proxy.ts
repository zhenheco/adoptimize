/**
 * Python 後端 API 代理工具
 *
 * 集中處理：
 * 1. Python 後端 URL 配置
 * 2. 標準化的錯誤處理
 * 3. 統一的回應格式
 */

import { NextResponse } from 'next/server'
import { getPythonApiUrl } from '@/lib/config/env'

/** 後端錯誤碼 */
type BackendErrorCode = 'BACKEND_ERROR' | 'SERVICE_UNAVAILABLE'

/** 標準錯誤回應格式 */
interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}

/**
 * 建立標準錯誤回應
 */
function createErrorResponse(
  code: BackendErrorCode,
  message: string,
  status: number
): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * 呼叫 Python 後端 API
 *
 * @param path - API 路徑（不含 base URL）
 * @param options - fetch 選項
 * @returns fetch Response 或 null（表示連線失敗）
 */
export async function fetchBackend(
  path: string,
  options: RequestInit = {}
): Promise<Response | null> {
  const baseUrl = getPythonApiUrl()
  const url = `${baseUrl}${path}`

  const defaultHeaders = { 'Content-Type': 'application/json' }
  const headers = { ...defaultHeaders, ...options.headers }

  try {
    return await fetch(url, { ...options, headers })
  } catch {
    return null
  }
}

/**
 * 處理後端回應並轉換為 NextResponse
 *
 * @param response - 後端回應（null 表示連線失敗）
 * @param transformData - 資料轉換函數
 * @param errorMessage - 錯誤時顯示的訊息
 */
export async function handleBackendResponse<T, R>(
  response: Response | null,
  transformData: (data: T) => R,
  errorMessage: string
): Promise<NextResponse> {
  // 連線失敗
  if (!response) {
    return createErrorResponse('SERVICE_UNAVAILABLE', '服務暫時無法使用', 503)
  }

  // 成功回應
  if (response.ok) {
    const data = (await response.json()) as T
    return NextResponse.json({ success: true, data: transformData(data) })
  }

  // 後端錯誤
  const errorData = await response.json().catch(() => ({}))
  const detail = (errorData as { detail?: string }).detail
  return createErrorResponse('BACKEND_ERROR', detail || errorMessage, response.status)
}

/**
 * 建立驗證錯誤回應
 */
export function createValidationError(code: string, message: string): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: { code, message } }, { status: 400 })
}
