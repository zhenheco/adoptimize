import { NextRequest, NextResponse } from 'next/server'
import {
  fetchBackend,
  handleBackendResponse,
  createValidationError,
} from '@/lib/api/backend-proxy'

/** 還原請求 */
interface RevertRequest {
  id: string
}

/** 後端還原回應 */
interface RevertResponse {
  id: string
  reverted: boolean
  reverted_at: string
}

/**
 * POST /api/v1/history/revert
 * 還原操作
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('Authorization')
  const body = (await request.json()) as RevertRequest
  const { id } = body

  if (!id) {
    return createValidationError('MISSING_ID', '缺少歷史記錄 ID')
  }

  const response = await fetchBackend(`/api/v1/history/${id}/revert`, {
    method: 'POST',
    headers: {
      ...(authHeader ? { 'Authorization': authHeader } : {}),
    },
  })

  return handleBackendResponse<RevertResponse, object>(
    response,
    (data) => ({
      id: data.id,
      reverted: data.reverted,
      reverted_at: data.reverted_at,
    }),
    '還原操作失敗'
  )
}
