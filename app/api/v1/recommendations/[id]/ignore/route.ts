import { NextRequest, NextResponse } from 'next/server'
import { fetchBackend, handleBackendResponse } from '@/lib/api/backend-proxy'

/** 後端忽略建議回應 */
interface IgnoreResponse {
  recommendation_id: string
  new_status: string
}

/**
 * POST /api/v1/recommendations/:id/ignore
 * 忽略建議
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const authHeader = request.headers.get('Authorization')

  const response = await fetchBackend(`/api/v1/recommendations/${id}/ignore`, {
    method: 'POST',
    headers: {
      ...(authHeader ? { 'Authorization': authHeader } : {}),
    },
  })

  return handleBackendResponse<IgnoreResponse, object>(
    response,
    (data) => ({
      id: data.recommendation_id,
      status: data.new_status,
      ignored_at: new Date().toISOString(),
    }),
    '忽略失敗'
  )
}
