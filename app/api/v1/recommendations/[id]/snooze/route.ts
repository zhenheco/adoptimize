import { NextRequest, NextResponse } from 'next/server'
import {
  fetchBackend,
  handleBackendResponse,
  createValidationError,
} from '@/lib/api/backend-proxy'

/** 延後建議請求 */
interface SnoozeRequest {
  snooze_until: string
}

/** 後端延後建議回應 */
interface SnoozeResponse {
  recommendation_id: string
  new_status: string
}

/**
 * POST /api/v1/recommendations/:id/snooze
 * 延後處理建議
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const authHeader = request.headers.get('Authorization')
  const body = (await request.json()) as SnoozeRequest
  const { snooze_until } = body

  if (!snooze_until) {
    return createValidationError('MISSING_SNOOZE_UNTIL', '缺少延後時間')
  }

  const response = await fetchBackend(`/api/v1/recommendations/${id}/snooze`, {
    method: 'POST',
    headers: {
      ...(authHeader ? { 'Authorization': authHeader } : {}),
    },
    body: JSON.stringify({ snooze_until }),
  })

  return handleBackendResponse<SnoozeResponse, object>(
    response,
    (data) => ({
      id: data.recommendation_id,
      status: data.new_status,
      snooze_until,
      snoozed_at: new Date().toISOString(),
    }),
    '延後操作失敗'
  )
}
