// AdOptimize API 類型定義

/**
 * 指標狀態類型
 */
export type MetricStatus = 'normal' | 'warning' | 'danger';

/**
 * 疲勞狀態類型
 */
export type FatigueStatus = 'healthy' | 'warning' | 'fatigued';

/**
 * 受眾健康狀態類型
 */
export type AudienceHealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * 健檢等級類型
 */
export type AuditGrade = 'excellent' | 'good' | 'needs_improvement' | 'critical';

/**
 * 平台類型
 */
export type Platform = 'google' | 'meta';

/**
 * 時間週期類型
 */
export type TimePeriod = 'today' | '7d' | '30d' | 'custom';

/**
 * 指標數值
 */
export interface MetricValue {
  value: number;
  change: number;
  status: MetricStatus;
}

/**
 * 儀表板總覽數據
 */
export interface DashboardOverview {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    spend: MetricValue;
    impressions: MetricValue;
    clicks: MetricValue;
    conversions: MetricValue;
    cpa: MetricValue;
    roas: MetricValue;
  };
  platforms: {
    google: { spend: number; conversions: number };
    meta: { spend: number; conversions: number };
  };
}

/**
 * 素材疲勞度資訊
 */
export interface CreativeFatigue {
  score: number;
  status: FatigueStatus;
  ctr_change: number;
  frequency: number;
  days_active: number;
}

/**
 * 素材資訊
 */
export interface Creative {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  thumbnail_url: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    spend: number;
  };
  fatigue: CreativeFatigue;
  status: 'active' | 'paused';
}

/**
 * 受眾資訊
 */
export interface Audience {
  id: string;
  name: string;
  type: 'CUSTOM' | 'LOOKALIKE' | 'SAVED';
  size: number;
  source: string;
  metrics: {
    reach: number;
    impressions: number;
    conversions: number;
    spend: number;
    cpa: number;
    roas: number;
  };
  health_score: number;
}

/**
 * 健檢報告維度
 */
export interface AuditDimension {
  score: number;
  weight: number;
  issues: number;
}

/**
 * 健檢報告
 */
export interface HealthAudit {
  id: string;
  account_id: string;
  overall_score: number;
  dimensions: {
    structure: AuditDimension;
    creative: AuditDimension;
    audience: AuditDimension;
    budget: AuditDimension;
    tracking: AuditDimension;
  };
  grade: AuditGrade;
  issues_count: number;
  created_at: string;
}

/**
 * 健檢問題
 */
export interface AuditIssue {
  id: string;
  category: 'STRUCTURE' | 'CREATIVE' | 'AUDIENCE' | 'BUDGET' | 'TRACKING';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  issue_code: string;
  title: string;
  description: string;
  impact_description: string;
  solution: string;
  affected_entities: string[];
  status: 'open' | 'resolved' | 'ignored';
}

/**
 * 建議
 */
export interface Recommendation {
  id: string;
  type: string;
  priority_score: number;
  title: string;
  description: string;
  action_module: string;
  estimated_impact: number;
  status: 'pending' | 'executed' | 'ignored' | 'snoozed';
  /** 延後到期時間（ISO 格式） */
  snooze_until?: string;
}

/**
 * 通知類型
 */
export type NotificationType = 'alert' | 'recommendation' | 'system' | 'info';

/**
 * 通知嚴重度
 */
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * 通知
 */
export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * 廣告帳戶狀態
 */
export type AccountStatus = 'active' | 'paused' | 'removed' | 'pending';

/**
 * 廣告帳戶
 */
export interface AdAccount {
  id: string;
  platform: Platform;
  external_id: string;
  name: string;
  currency: string;
  timezone: string;
  status: AccountStatus;
  last_sync_at?: string;
  created_at: string;
}

/**
 * 訂閱層級
 */
export type SubscriptionTier = 'STARTER' | 'PROFESSIONAL' | 'AGENCY' | 'ENTERPRISE';

/**
 * 執行限制資訊
 */
export interface ActionLimitInfo {
  can_execute: boolean;
  remaining_actions?: number;
  limit?: number;
  current_count: number;
  resets_at: string;
}

/**
 * API 成功回應
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
    total_pages?: number;
    unread_count?: number;
    period?: { start: string; end: string };
  };
  summary?: Record<string, unknown>;
}

/**
 * API 錯誤回應
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================
// 智慧受眾建議相關類型
// ============================================================

/**
 * 產業選項
 */
export interface IndustryOption {
  code: string;
  name: string;
  description: string;
}

/**
 * 廣告目標選項
 */
export interface ObjectiveOption {
  code: string;
  name: string;
  funnel_stage: string;
  description: string;
}

/**
 * 選項回應
 */
export interface SuggestionOptionsResponse {
  industries: IndustryOption[];
  objectives: ObjectiveOption[];
}

/**
 * 建議的興趣標籤
 */
export interface SuggestedInterest {
  meta_interest_id: string;
  name: string;
  name_zh: string;
  relevance_score: number;
  reason: string;
  estimated_reach?: number;
}

/**
 * 智慧建議狀態
 */
export type SuggestionStatus = 'generated' | 'saved' | 'executed';

/**
 * 智慧受眾建議
 */
export interface AudienceSuggestion {
  id: string;
  account_id: string;
  industry_code: string;
  objective_code: string;
  suggested_interests: SuggestedInterest[];
  reasoning?: string;
  budget_allocation?: {
    awareness: number;
    consideration: number;
    conversion: number;
    retention: number;
  };
  creative_recommendations?: string[];
  suggested_ad_copy?: string;
  estimated_reach_lower?: number;
  estimated_reach_upper?: number;
  estimated_cpa?: number;
  estimated_roas?: number;
  confidence_score?: number;
  status: SuggestionStatus;
  meta_audience_id?: string;
  meta_adset_id?: string;
  meta_ad_id?: string;
  created_at: string;
  // 功能權限
  can_view_full: boolean;
  can_create_audience: boolean;
  can_create_ad: boolean;
  hidden_interests_count?: number;
}

/**
 * 智慧建議使用限制
 */
export interface SuggestionLimit {
  can_generate: boolean;
  remaining_suggestions?: number;
  limit?: number;
  current_count: number;
  resets_at: string;
  message: string;
  features: {
    can_view_full_report: boolean;
    can_create_audience: boolean;
    can_create_ad: boolean;
    has_api_access: boolean;
    max_visible_interests: number;
  };
}

/**
 * 生成建議請求
 */
export interface GenerateSuggestionRequest {
  account_id: string;
  industry_code: string;
  objective_code: string;
  additional_context?: string;
}

/**
 * 建立受眾請求
 */
export interface SaveAudienceRequest {
  audience_name?: string;
}

/**
 * 建立受眾回應
 */
export interface SaveAudienceResponse {
  success: boolean;
  suggestion_id: string;
  meta_audience_id?: string;
  audience_name: string;
  message: string;
}

/**
 * 建立廣告請求
 */
export interface CreateAdRequest {
  campaign_id: string;
  daily_budget: number;
  ad_name?: string;
  use_suggested_copy?: boolean;
  custom_ad_copy?: string;
}

/**
 * 建立廣告回應
 */
export interface CreateAdResponse {
  success: boolean;
  suggestion_id: string;
  meta_adset_id?: string;
  meta_ad_id?: string;
  adset_name: string;
  ad_name: string;
  message: string;
}
