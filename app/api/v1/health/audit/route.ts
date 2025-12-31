import { NextRequest, NextResponse } from 'next/server';
import type { HealthAudit, AuditIssue, ApiResponse } from '@/lib/api/types';
import {
  calculateAuditScore,
  createIssue,
  getAuditGrade,
  STRUCTURE_ISSUES,
  CREATIVE_ISSUES,
  AUDIENCE_ISSUES,
  BUDGET_ISSUES,
  TRACKING_ISSUES,
  AUDIT_WEIGHTS,
} from '@/lib/utils/health-audit';

/**
 * 產生模擬健檢問題
 */
function generateMockIssues(): AuditIssue[] {
  const issues: AuditIssue[] = [
    {
      id: 'issue-1',
      category: 'CREATIVE',
      severity: 'CRITICAL',
      issue_code: 'CREATIVE_FATIGUE_HIGH',
      title: '素材嚴重疲勞',
      description: '有 3 個素材的疲勞度已超過 80 分，CTR 明顯下降',
      impact_description: '預估每日損失 $150 的廣告效益',
      solution: '建議立即更換或暫停這些素材，並上傳新的創意內容',
      affected_entities: ['creative-1', 'creative-5', 'creative-8'],
      status: 'open',
    },
    {
      id: 'issue-2',
      category: 'AUDIENCE',
      severity: 'HIGH',
      issue_code: 'AUDIENCE_OVERLAP',
      title: '受眾重疊率過高',
      description: '「網站訪客」和「Lookalike 1%」受眾重疊率達 35%',
      impact_description: '可能導致自我競價，增加廣告成本',
      solution: '建議將其中一個受眾從另一個廣告組中排除',
      affected_entities: ['audience-1', 'audience-3'],
      status: 'open',
    },
    {
      id: 'issue-3',
      category: 'BUDGET',
      severity: 'MEDIUM',
      issue_code: 'BUDGET_UNDERUTILIZED',
      title: '預算使用率偏低',
      description: '有 2 個廣告活動的預算使用率低於 60%',
      impact_description: '未能充分利用預算，可能錯失曝光機會',
      solution: '考慮降低預算或調整受眾設定以提高觸及率',
      affected_entities: ['campaign-2', 'campaign-4'],
      status: 'open',
    },
    {
      id: 'issue-4',
      category: 'TRACKING',
      severity: 'HIGH',
      issue_code: 'PIXEL_NOT_FIRING',
      title: 'Pixel 未正常觸發',
      description: 'Meta Pixel 在過去 24 小時內未收到任何事件',
      impact_description: '無法追蹤轉換，可能影響機器學習優化',
      solution: '檢查網站上的 Pixel 安裝代碼是否正確',
      affected_entities: ['pixel-1'],
      status: 'open',
    },
    {
      id: 'issue-5',
      category: 'STRUCTURE',
      severity: 'LOW',
      issue_code: 'CAMPAIGN_NAMING',
      title: '廣告活動命名不一致',
      description: '有 3 個廣告活動的命名規則不一致',
      impact_description: '可能增加管理和分析的難度',
      solution: '建議採用統一的命名格式，如：[目標]_[受眾]_[日期]',
      affected_entities: ['campaign-1', 'campaign-3', 'campaign-5'],
      status: 'open',
    },
    {
      id: 'issue-6',
      category: 'CREATIVE',
      severity: 'MEDIUM',
      issue_code: 'CREATIVE_DIVERSITY_LOW',
      title: '素材多樣性不足',
      description: '目前僅使用圖片素材，缺少影片和輪播格式',
      impact_description: '可能限制觸及不同偏好的使用者',
      solution: '建議增加影片和輪播格式的素材',
      affected_entities: [],
      status: 'open',
    },
    {
      id: 'issue-7',
      category: 'AUDIENCE',
      severity: 'MEDIUM',
      issue_code: 'AUDIENCE_SIZE_SMALL',
      title: '受眾規模過小',
      description: '「高價值客戶」受眾規模僅 2,500 人',
      impact_description: '可能導致投放頻率過高，加速素材疲勞',
      solution: '考慮擴大受眾範圍或使用 Lookalike 受眾',
      affected_entities: ['audience-5'],
      status: 'open',
    },
    {
      id: 'issue-8',
      category: 'BUDGET',
      severity: 'LOW',
      issue_code: 'BID_STRATEGY_MISMATCH',
      title: '出價策略可優化',
      description: '轉換目標活動使用的是點擊優化出價',
      impact_description: '可能獲得較多點擊但轉換效果不佳',
      solution: '建議調整為轉換優化出價策略',
      affected_entities: ['campaign-6'],
      status: 'open',
    },
    {
      id: 'issue-9',
      category: 'TRACKING',
      severity: 'LOW',
      issue_code: 'UTM_MISSING',
      title: 'UTM 參數缺失',
      description: '部分廣告的目標網址缺少 UTM 追蹤參數',
      impact_description: '無法在 GA 中追蹤廣告來源',
      solution: '為所有廣告添加一致的 UTM 參數',
      affected_entities: ['ad-3', 'ad-7', 'ad-12'],
      status: 'open',
    },
    {
      id: 'issue-10',
      category: 'CREATIVE',
      severity: 'HIGH',
      issue_code: 'CREATIVE_FREQUENCY_HIGH',
      title: '投放頻率過高',
      description: '2 個素材的平均頻率已超過 4 次',
      impact_description: '過高的頻率會導致使用者疲勞和廣告盲',
      solution: '降低預算或擴大受眾以減少頻率',
      affected_entities: ['creative-2', 'creative-6'],
      status: 'open',
    },
  ];

  return issues;
}

/**
 * 產生模擬健檢報告
 *
 * 使用 calculateAuditScore 進行計算
 */
function generateMockAudit(): HealthAudit {
  // 使用 health-audit utility 計算分數
  const auditResult = calculateAuditScore({
    structure: {
      baseScore: 100,
      issues: [
        createIssue('POOR_NAMING', STRUCTURE_ISSUES.POOR_NAMING),
        createIssue('AUDIENCE_COMPETITION', STRUCTURE_ISSUES.AUDIENCE_COMPETITION),
      ],
    },
    creative: {
      baseScore: 100,
      issues: [
        createIssue('CREATIVE_FATIGUE', CREATIVE_ISSUES.CREATIVE_FATIGUE),
        createIssue('HIGH_FREQUENCY', CREATIVE_ISSUES.HIGH_FREQUENCY),
        createIssue('LOW_VARIETY', CREATIVE_ISSUES.LOW_VARIETY),
        createIssue('STALE_CREATIVE', CREATIVE_ISSUES.STALE_CREATIVE),
      ],
    },
    audience: {
      baseScore: 100,
      issues: [
        createIssue('HIGH_OVERLAP', AUDIENCE_ISSUES.HIGH_OVERLAP),
        createIssue('SIZE_TOO_SMALL', AUDIENCE_ISSUES.SIZE_TOO_SMALL),
      ],
    },
    budget: {
      baseScore: 100,
      issues: [
        createIssue('LOW_SPEND_RATE', BUDGET_ISSUES.LOW_SPEND_RATE),
        createIssue('WRONG_BID_STRATEGY', BUDGET_ISSUES.WRONG_BID_STRATEGY),
      ],
    },
    tracking: {
      baseScore: 100,
      issues: [
        createIssue('PIXEL_NOT_FIRING', TRACKING_ISSUES.PIXEL_NOT_FIRING),
        createIssue('MISSING_UTM', TRACKING_ISSUES.MISSING_UTM),
      ],
    },
  });

  return {
    id: 'audit-1',
    account_id: 'account-1',
    overall_score: auditResult.overallScore,
    dimensions: {
      structure: auditResult.dimensions.structure,
      creative: auditResult.dimensions.creative,
      audience: auditResult.dimensions.audience,
      budget: auditResult.dimensions.budget,
      tracking: auditResult.dimensions.tracking,
    },
    grade: auditResult.grade,
    issues_count: auditResult.totalIssues,
    created_at: new Date().toISOString(),
  };
}

/**
 * GET /api/v1/health/audit
 *
 * 取得最新的健檢報告
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // const searchParams = request.nextUrl.searchParams;
  // const accountId = searchParams.get('account_id');

  // TODO: 連接到 Python 後端 API
  // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
  // const response = await fetch(`${pythonApiUrl}/api/v1/audits/latest?account_id=${accountId}`);

  // 使用模擬數據
  const audit = generateMockAudit();
  const issues = generateMockIssues();

  const response: ApiResponse<{ audit: HealthAudit; issues: AuditIssue[] }> = {
    data: { audit, issues },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/v1/health/audit
 *
 * 觸發新的健檢
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // const body = await request.json();
  // const accountId = body.account_id;

  // TODO: 連接到 Python 後端 API 觸發健檢
  // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
  // const response = await fetch(`${pythonApiUrl}/api/v1/audits`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ account_id: accountId }),
  // });

  // 模擬健檢需要時間
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 返回新的健檢結果
  const audit = generateMockAudit();
  const issues = generateMockIssues();

  const response: ApiResponse<{ audit: HealthAudit; issues: AuditIssue[] }> = {
    data: { audit, issues },
  };

  return NextResponse.json(response);
}
