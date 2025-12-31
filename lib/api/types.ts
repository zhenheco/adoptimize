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
  status: 'pending' | 'executed' | 'ignored';
}

/**
 * API 成功回應
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    total?: number;
    period?: { start: string; end: string };
  };
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
