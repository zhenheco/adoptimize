/**
 * API 客戶端設定
 * 處理前端與後端 (FastAPI) 之間的通訊
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * API 請求設定
 */
interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * API 錯誤類別
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 建立完整的 API URL（包含查詢參數）
 */
function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(endpoint, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

/**
 * 通用 API 請求函數
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.details
    );
  }

  return data;
}

/**
 * API 客戶端
 * 提供各種 HTTP 方法的便利函數
 */
export const api = {
  /**
   * GET 請求
   */
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: 'GET', params }),

  /**
   * POST 請求
   */
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PUT 請求
   */
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * DELETE 請求
   */
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

/**
 * BFF API 路由 (Next.js API Routes)
 */
export const bffApi = {
  /**
   * 儀表板總覽數據
   */
  getDashboardOverview: (period: string = '7d') =>
    api.get<DashboardOverviewResponse>('/api/v1/dashboard/overview', { period }),

  /**
   * 取得素材列表
   */
  getCreatives: (page: number = 1, limit: number = 20) =>
    api.get<CreativesListResponse>('/api/v1/creatives', {
      page: String(page),
      limit: String(limit),
    }),

  /**
   * 取得受眾列表
   */
  getAudiences: () => api.get<AudiencesListResponse>('/api/v1/audiences'),

  /**
   * 觸發帳戶健檢
   */
  triggerAudit: (accountId: string) =>
    api.post<AuditResponse>('/api/v1/audits', { account_id: accountId }),

  /**
   * 取得建議列表
   */
  getRecommendations: () =>
    api.get<RecommendationsListResponse>('/api/v1/recommendations'),
};

// 類型定義（將在 types 目錄中詳細定義）
interface DashboardOverviewResponse {
  data: {
    period: { start: string; end: string };
    metrics: Record<string, { value: number; change: number; status: string }>;
    platforms: Record<string, { spend: number; conversions: number }>;
  };
}

interface CreativesListResponse {
  data: unknown[];
  meta: { page: number; total: number };
}

interface AudiencesListResponse {
  data: unknown[];
  meta: { total: number };
}

interface AuditResponse {
  data: { id: string; status: string };
}

interface RecommendationsListResponse {
  data: unknown[];
  meta: { total: number };
}
