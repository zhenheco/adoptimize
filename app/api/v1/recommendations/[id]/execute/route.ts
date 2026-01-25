import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, handleBackendResponse } from '@/lib/api/backend-proxy'

/** 後端執行建議回應 */
interface ExecuteResponse {
  recommendation_id: string
  new_status: string
  executed_at: string
  remaining_actions: number
}

/**
 * POST /api/v1/recommendations/:id/execute
 * 執行建議
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params

  const response = await fetchBackend(`/api/v1/recommendations/${id}/execute`, {
    method: 'POST',
  })

  return handleBackendResponse<ExecuteResponse, object>(
    response,
    (data) => ({
      id: data.recommendation_id,
      status: data.new_status,
      executed_at: data.executed_at,
      remaining_actions: data.remaining_actions,
    }),
    '執行失敗'
  )
}
