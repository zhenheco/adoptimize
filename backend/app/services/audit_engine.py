# -*- coding: utf-8 -*-
"""
帳戶健檢評分引擎

根據 specs/requirements.md 定義的 5 維度評分系統

總分 = 結構(20%) + 素材(25%) + 受眾(25%) + 預算(20%) + 追蹤(10%)

健康分數等級：
- 🏆 優秀 (90-100): 帳戶狀態極佳
- ✅ 良好 (70-89): 有小問題需關注
- ⚠️ 需改善 (50-69): 多個問題需處理
- 🚨 危險 (0-49): 嚴重問題需立即處理
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Literal


class IssueSeverity(str, Enum):
    """問題嚴重程度"""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IssueCategory(str, Enum):
    """問題類別"""

    STRUCTURE = "STRUCTURE"
    CREATIVE = "CREATIVE"
    AUDIENCE = "AUDIENCE"
    BUDGET = "BUDGET"
    TRACKING = "TRACKING"


class AuditGrade(str, Enum):
    """健檢等級"""

    EXCELLENT = "excellent"
    GOOD = "good"
    NEEDS_IMPROVEMENT = "needs_improvement"
    CRITICAL = "critical"


# 維度權重
AUDIT_WEIGHTS = {
    "structure": 0.20,
    "creative": 0.25,
    "audience": 0.25,
    "budget": 0.20,
    "tracking": 0.10,
}

# 等級門檻
AUDIT_GRADE_THRESHOLDS = {
    "excellent": 90,
    "good": 70,
    "needs_improvement": 50,
}


@dataclass
class AuditIssue:
    """健檢問題"""

    code: str
    category: IssueCategory
    severity: IssueSeverity
    title: str
    description: str
    deduction: int
    impact_description: str = ""
    solution: str = ""
    affected_entities: dict[str, Any] | None = None


@dataclass
class DimensionScoreResult:
    """維度評分結果"""

    score: int
    weight: float
    issues_count: int
    deductions: int


@dataclass
class AuditScoreResult:
    """健檢評分結果"""

    overall_score: int
    grade: AuditGrade
    dimensions: dict[str, DimensionScoreResult]
    total_issues: int
    issues: list[AuditIssue] = field(default_factory=list)


# ============================================================
# 預定義問題 (來自 specs/requirements.md)
# ============================================================

STRUCTURE_ISSUES = {
    "POOR_NAMING": AuditIssue(
        code="POOR_NAMING",
        category=IssueCategory.STRUCTURE,
        severity=IssueSeverity.LOW,
        title="廣告活動命名不清晰",
        description="缺乏清晰的命名規則，難以識別和管理",
        deduction=5,
        impact_description="增加管理成本，難以追蹤效果",
        solution="建立統一的命名規則，如：[平台]_[目標]_[受眾]_[日期]",
    ),
    "TOO_FEW_ADSETS": AuditIssue(
        code="TOO_FEW_ADSETS",
        category=IssueCategory.STRUCTURE,
        severity=IssueSeverity.MEDIUM,
        title="廣告組數量過少",
        description="每活動應有 3-10 個廣告組進行測試",
        deduction=10,
        impact_description="測試範圍有限，可能錯過最佳受眾",
        solution="增加廣告組以測試不同受眾和素材組合",
    ),
    "TOO_MANY_ADSETS": AuditIssue(
        code="TOO_MANY_ADSETS",
        category=IssueCategory.STRUCTURE,
        severity=IssueSeverity.MEDIUM,
        title="廣告組數量過多",
        description="每活動超過 10 個廣告組可能導致預算分散",
        deduction=10,
        impact_description="預算分散，各廣告組無法獲得足夠學習數據",
        solution="合併表現相似的廣告組，保持 3-10 個最佳廣告組",
    ),
    "WRONG_ADS_PER_ADSET": AuditIssue(
        code="WRONG_ADS_PER_ADSET",
        category=IssueCategory.STRUCTURE,
        severity=IssueSeverity.MEDIUM,
        title="廣告組內廣告數量不當",
        description="每組應有 3-6 則廣告進行 A/B 測試",
        deduction=8,
        impact_description="廣告過少無法有效測試，過多則數據分散",
        solution="調整每組廣告數量至 3-6 則",
    ),
    "MISSING_CONVERSION_TRACKING": AuditIssue(
        code="MISSING_CONVERSION_TRACKING",
        category=IssueCategory.STRUCTURE,
        severity=IssueSeverity.HIGH,
        title="轉換目標未設追蹤",
        description="無法追蹤廣告效果，影響優化決策",
        deduction=15,
        impact_description="無法衡量 ROI，無法有效優化",
        solution="設定轉換追蹤（如購買、註冊等關鍵事件）",
    ),
    "AUDIENCE_COMPETITION": AuditIssue(
        code="AUDIENCE_COMPETITION",
        category=IssueCategory.STRUCTURE,
        severity=IssueSeverity.MEDIUM,
        title="受眾競爭",
        description="同受眾有多個廣告組競爭，可能導致自我競標",
        deduction=12,
        impact_description="廣告成本上升，浪費預算",
        solution="合併相似受眾的廣告組，或使用受眾排除功能",
    ),
}

CREATIVE_ISSUES = {
    "LOW_VARIETY": AuditIssue(
        code="LOW_VARIETY",
        category=IssueCategory.CREATIVE,
        severity=IssueSeverity.MEDIUM,
        title="素材多樣性不足",
        description="應使用 3 種以上素材類型",
        deduction=10,
        impact_description="無法觸及不同偏好的受眾",
        solution="新增影片、輪播、單圖等多種素材類型",
    ),
    "CREATIVE_FATIGUE": AuditIssue(
        code="CREATIVE_FATIGUE",
        category=IssueCategory.CREATIVE,
        severity=IssueSeverity.HIGH,
        title="素材疲勞",
        description="CTR 週降幅超過 15%，素材效果下降",
        deduction=12,
        impact_description="點擊率下降，轉換成本上升",
        solution="立即更換或更新素材，使用新的創意元素",
    ),
    "HIGH_FREQUENCY": AuditIssue(
        code="HIGH_FREQUENCY",
        category=IssueCategory.CREATIVE,
        severity=IssueSeverity.MEDIUM,
        title="投放頻率過高",
        description="頻率超過 3 次，受眾可能產生廣告疲勞",
        deduction=8,
        impact_description="受眾產生負面觀感，品牌形象受損",
        solution="擴大受眾範圍或降低投放頻率上限",
    ),
    "STALE_CREATIVE": AuditIssue(
        code="STALE_CREATIVE",
        category=IssueCategory.CREATIVE,
        severity=IssueSeverity.MEDIUM,
        title="素材過時",
        description="超過 30 天未更新素材",
        deduction=10,
        impact_description="受眾對舊素材產生倦怠",
        solution="定期更新素材，保持內容新鮮度",
    ),
    "TRUNCATED_COPY": AuditIssue(
        code="TRUNCATED_COPY",
        category=IssueCategory.CREATIVE,
        severity=IssueSeverity.LOW,
        title="文案被截斷",
        description="標題過長被截斷，影響訊息傳達",
        deduction=5,
        impact_description="無法完整傳達廣告訊息",
        solution="精簡標題至平台建議字數限制內",
    ),
}

AUDIENCE_ISSUES = {
    "SIZE_TOO_SMALL": AuditIssue(
        code="SIZE_TOO_SMALL",
        category=IssueCategory.AUDIENCE,
        severity=IssueSeverity.MEDIUM,
        title="受眾規模過小",
        description="受眾規模低於 10K，可能限制投放",
        deduction=10,
        impact_description="廣告投放受限，無法有效觸及",
        solution="擴大受眾條件或使用 Lookalike 擴展",
    ),
    "SIZE_TOO_LARGE": AuditIssue(
        code="SIZE_TOO_LARGE",
        category=IssueCategory.AUDIENCE,
        severity=IssueSeverity.LOW,
        title="受眾規模過大",
        description="受眾規模超過 2M，可能不夠精準",
        deduction=5,
        impact_description="觸及到非目標受眾，降低效率",
        solution="縮小受眾範圍，增加更多篩選條件",
    ),
    "HIGH_OVERLAP": AuditIssue(
        code="HIGH_OVERLAP",
        category=IssueCategory.AUDIENCE,
        severity=IssueSeverity.HIGH,
        title="受眾重疊率高",
        description="受眾重疊率超過 20%，可能自我競爭",
        deduction=12,
        impact_description="浪費預算在重複受眾上",
        solution="使用受眾排除功能，避免重疊投放",
    ),
    "NO_EXCLUSION": AuditIssue(
        code="NO_EXCLUSION",
        category=IssueCategory.AUDIENCE,
        severity=IssueSeverity.HIGH,
        title="未排除已購買者",
        description="未設定排除已購買受眾，浪費預算",
        deduction=15,
        impact_description="對已購買客戶重複投放，浪費預算",
        solution="建立已購買者受眾並設為排除",
    ),
    "POOR_LOOKALIKE_SOURCE": AuditIssue(
        code="POOR_LOOKALIKE_SOURCE",
        category=IssueCategory.AUDIENCE,
        severity=IssueSeverity.MEDIUM,
        title="Lookalike 來源品質不佳",
        description="Lookalike 應基於購買者而非訪客",
        deduction=8,
        impact_description="Lookalike 受眾品質不佳，轉換率低",
        solution="使用購買者或高價值客戶作為 Lookalike 來源",
    ),
    "STALE_AUDIENCE": AuditIssue(
        code="STALE_AUDIENCE",
        category=IssueCategory.AUDIENCE,
        severity=IssueSeverity.MEDIUM,
        title="受眾過時",
        description="受眾超過 30 天未更新",
        deduction=10,
        impact_description="受眾資料過時，精準度下降",
        solution="定期更新受眾資料，移除過時成員",
    ),
}

BUDGET_ISSUES = {
    "INEFFICIENT_ALLOCATION": AuditIssue(
        code="INEFFICIENT_ALLOCATION",
        category=IssueCategory.BUDGET,
        severity=IssueSeverity.HIGH,
        title="預算分配低效",
        description="低效活動佔比超過 30%",
        deduction=15,
        impact_description="大量預算浪費在低效活動上",
        solution="將預算轉移至高效活動，暫停低效活動",
    ),
    "LOW_SPEND_RATE": AuditIssue(
        code="LOW_SPEND_RATE",
        category=IssueCategory.BUDGET,
        severity=IssueSeverity.MEDIUM,
        title="預算消耗率低",
        description="預算消耗低於 80%，未充分利用",
        deduction=10,
        impact_description="錯失潛在轉換機會",
        solution="擴大受眾或提高出價以增加投放",
    ),
    "OVERSPEND": AuditIssue(
        code="OVERSPEND",
        category=IssueCategory.BUDGET,
        severity=IssueSeverity.MEDIUM,
        title="預算超支",
        description="預算消耗超過 100%",
        deduction=10,
        impact_description="預算控制失敗，可能影響整體規劃",
        solution="調整預算設定或出價策略",
    ),
    "LEARNING_PHASE_BUDGET": AuditIssue(
        code="LEARNING_PHASE_BUDGET",
        category=IssueCategory.BUDGET,
        severity=IssueSeverity.HIGH,
        title="學習期預算不足",
        description="預算不足以達到每天 10 次轉換",
        deduction=12,
        impact_description="廣告組無法完成學習，優化效果差",
        solution="增加預算或合併廣告組以集中學習",
    ),
    "WRONG_BID_STRATEGY": AuditIssue(
        code="WRONG_BID_STRATEGY",
        category=IssueCategory.BUDGET,
        severity=IssueSeverity.MEDIUM,
        title="出價策略不符",
        description="出價策略與目標不匹配",
        deduction=10,
        impact_description="無法有效達成廣告目標",
        solution="根據活動目標選擇適合的出價策略",
    ),
}

TRACKING_ISSUES = {
    "NO_CONVERSION_TRACKING": AuditIssue(
        code="NO_CONVERSION_TRACKING",
        category=IssueCategory.TRACKING,
        severity=IssueSeverity.CRITICAL,
        title="未設定轉換追蹤",
        description="缺少轉換追蹤，無法衡量廣告效果",
        deduction=20,
        impact_description="無法衡量 ROI，無法進行任何優化",
        solution="立即設定轉換追蹤（Pixel/API 轉換追蹤）",
    ),
    "PIXEL_NOT_FIRING": AuditIssue(
        code="PIXEL_NOT_FIRING",
        category=IssueCategory.TRACKING,
        severity=IssueSeverity.CRITICAL,
        title="Pixel 未觸發",
        description="Pixel 未正常觸發，無法收集數據",
        deduction=18,
        impact_description="轉換數據遺失，優化無依據",
        solution="檢查並修復 Pixel 安裝，確保正常觸發",
    ),
    "INCOMPLETE_FUNNEL": AuditIssue(
        code="INCOMPLETE_FUNNEL",
        category=IssueCategory.TRACKING,
        severity=IssueSeverity.MEDIUM,
        title="漏斗追蹤不完整",
        description="未追蹤完整漏斗事件",
        deduction=10,
        impact_description="無法識別轉換流失點",
        solution="設定完整漏斗事件（瀏覽、加入購物車、結帳、購買）",
    ),
    "MISSING_UTM": AuditIssue(
        code="MISSING_UTM",
        category=IssueCategory.TRACKING,
        severity=IssueSeverity.LOW,
        title="缺少 UTM 參數",
        description="缺少一致的 UTM 標記",
        deduction=8,
        impact_description="無法在 GA 追蹤廣告流量來源",
        solution="為所有廣告連結設定統一的 UTM 參數",
    ),
}

# 所有問題的集合
ALL_ISSUES = {
    **STRUCTURE_ISSUES,
    **CREATIVE_ISSUES,
    **AUDIENCE_ISSUES,
    **BUDGET_ISSUES,
    **TRACKING_ISSUES,
}


def calculate_dimension_score(
    base_score: int, issues: list[AuditIssue], weight: float
) -> DimensionScoreResult:
    """
    計算維度分數

    從基礎分數開始，根據問題扣分

    Args:
        base_score: 基礎分數（通常為 100）
        issues: 該維度的問題列表
        weight: 維度權重

    Returns:
        DimensionScoreResult: 維度評分結果
    """
    deductions = sum(issue.deduction for issue in issues)
    score = max(0, base_score - deductions)

    return DimensionScoreResult(
        score=score,
        weight=weight,
        issues_count=len(issues),
        deductions=deductions,
    )


def get_audit_grade(score: int) -> AuditGrade:
    """
    根據分數取得健檢等級

    Args:
        score: 總分 (0-100)

    Returns:
        AuditGrade: 健檢等級
    """
    if score >= AUDIT_GRADE_THRESHOLDS["excellent"]:
        return AuditGrade.EXCELLENT
    if score >= AUDIT_GRADE_THRESHOLDS["good"]:
        return AuditGrade.GOOD
    if score >= AUDIT_GRADE_THRESHOLDS["needs_improvement"]:
        return AuditGrade.NEEDS_IMPROVEMENT
    return AuditGrade.CRITICAL


@dataclass
class DimensionInput:
    """維度評分輸入"""

    base_score: int = 100
    issues: list[AuditIssue] = field(default_factory=list)


@dataclass
class AuditInput:
    """健檢評分輸入"""

    structure: DimensionInput = field(default_factory=DimensionInput)
    creative: DimensionInput = field(default_factory=DimensionInput)
    audience: DimensionInput = field(default_factory=DimensionInput)
    budget: DimensionInput = field(default_factory=DimensionInput)
    tracking: DimensionInput = field(default_factory=DimensionInput)


def calculate_audit_score(audit_input: AuditInput) -> AuditScoreResult:
    """
    計算健檢總分

    根據五個維度的加權平均計算

    Args:
        audit_input: 各維度評分輸入

    Returns:
        AuditScoreResult: 健檢評分結果

    Example:
        >>> from dataclasses import dataclass, field
        >>> input = AuditInput(
        ...     structure=DimensionInput(base_score=100, issues=[STRUCTURE_ISSUES["POOR_NAMING"]]),
        ...     creative=DimensionInput(),
        ...     audience=DimensionInput(),
        ...     budget=DimensionInput(),
        ...     tracking=DimensionInput(),
        ... )
        >>> result = calculate_audit_score(input)
        >>> result.overall_score
        99
        >>> result.grade
        <AuditGrade.EXCELLENT: 'excellent'>
    """
    # 計算各維度分數
    structure = calculate_dimension_score(
        audit_input.structure.base_score,
        audit_input.structure.issues,
        AUDIT_WEIGHTS["structure"],
    )
    creative = calculate_dimension_score(
        audit_input.creative.base_score,
        audit_input.creative.issues,
        AUDIT_WEIGHTS["creative"],
    )
    audience = calculate_dimension_score(
        audit_input.audience.base_score,
        audit_input.audience.issues,
        AUDIT_WEIGHTS["audience"],
    )
    budget = calculate_dimension_score(
        audit_input.budget.base_score,
        audit_input.budget.issues,
        AUDIT_WEIGHTS["budget"],
    )
    tracking = calculate_dimension_score(
        audit_input.tracking.base_score,
        audit_input.tracking.issues,
        AUDIT_WEIGHTS["tracking"],
    )

    # 計算加權總分
    overall_score = round(
        structure.score * structure.weight
        + creative.score * creative.weight
        + audience.score * audience.weight
        + budget.score * budget.weight
        + tracking.score * tracking.weight
    )

    # 收集所有問題
    all_issues = (
        audit_input.structure.issues
        + audit_input.creative.issues
        + audit_input.audience.issues
        + audit_input.budget.issues
        + audit_input.tracking.issues
    )

    total_issues = (
        structure.issues_count
        + creative.issues_count
        + audience.issues_count
        + budget.issues_count
        + tracking.issues_count
    )

    return AuditScoreResult(
        overall_score=overall_score,
        grade=get_audit_grade(overall_score),
        dimensions={
            "structure": structure,
            "creative": creative,
            "audience": audience,
            "budget": budget,
            "tracking": tracking,
        },
        total_issues=total_issues,
        issues=all_issues,
    )


def get_issue_by_code(code: str) -> AuditIssue | None:
    """
    根據問題代碼取得問題定義

    Args:
        code: 問題代碼

    Returns:
        AuditIssue: 問題定義，若不存在則返回 None
    """
    return ALL_ISSUES.get(code)


def create_issue_with_entities(
    code: str, affected_entities: dict[str, Any] | None = None
) -> AuditIssue | None:
    """
    建立問題物件並附加受影響實體

    Args:
        code: 問題代碼
        affected_entities: 受影響的實體

    Returns:
        AuditIssue: 帶有受影響實體的問題物件
    """
    issue = get_issue_by_code(code)
    if issue is None:
        return None

    # 建立新的 issue 副本並設定 affected_entities
    return AuditIssue(
        code=issue.code,
        category=issue.category,
        severity=issue.severity,
        title=issue.title,
        description=issue.description,
        deduction=issue.deduction,
        impact_description=issue.impact_description,
        solution=issue.solution,
        affected_entities=affected_entities,
    )
