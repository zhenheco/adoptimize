# -*- coding: utf-8 -*-
"""
建議生成引擎

根據 specs/requirements.md 定義的優先級公式

優先級分數 = 嚴重度基礎分 + 金額影響分 + 修復難度分 + 影響範圍分

- 嚴重度基礎分：Critical=100, High=70, Medium=40, Low=20
- 金額影響分：預估影響金額 / 100（上限 50 分）
- 修復難度分：一鍵=30, 簡單=20, 中等=10, 複雜=0
- 影響範圍分：每個受影響實體 +5 分（無上限）
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from uuid import uuid4

from app.services.audit_engine import AuditIssue, IssueSeverity


class ActionDifficulty(str, Enum):
    """修復難度"""

    ONE_CLICK = "one_click"  # 一鍵
    SIMPLE = "simple"        # 簡單
    MEDIUM = "medium"        # 中等
    COMPLEX = "complex"      # 複雜


class ActionModule(str, Enum):
    """執行模組"""

    PAUSE_CREATIVE = "pause_creative"
    ENABLE_CREATIVE = "enable_creative"
    PAUSE_CAMPAIGN = "pause_campaign"
    ENABLE_CAMPAIGN = "enable_campaign"
    PAUSE_ADSET = "pause_adset"
    ENABLE_ADSET = "enable_adset"
    ADJUST_BUDGET = "adjust_budget"
    ADD_EXCLUSION = "add_exclusion"
    UPDATE_AUDIENCE = "update_audience"
    MANUAL_FIX = "manual_fix"


class RecommendationStatus(str, Enum):
    """建議狀態"""

    PENDING = "pending"
    EXECUTED = "executed"
    IGNORED = "ignored"


# 嚴重度基礎分
SEVERITY_BASE_SCORES = {
    IssueSeverity.CRITICAL: 100,
    IssueSeverity.HIGH: 70,
    IssueSeverity.MEDIUM: 40,
    IssueSeverity.LOW: 20,
}

# 修復難度分
DIFFICULTY_SCORES = {
    ActionDifficulty.ONE_CLICK: 30,
    ActionDifficulty.SIMPLE: 20,
    ActionDifficulty.MEDIUM: 10,
    ActionDifficulty.COMPLEX: 0,
}

# 金額影響分上限
MAX_IMPACT_SCORE = 50

# 每個受影響實體的分數
ENTITY_SCORE = 5


@dataclass
class ActionParams:
    """執行參數"""

    target_type: str  # CAMPAIGN, ADSET, AD, CREATIVE, AUDIENCE
    target_id: str
    action: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class Recommendation:
    """建議"""

    id: str
    issue: AuditIssue
    priority_score: int
    title: str
    description: str
    action_module: ActionModule
    action_params: ActionParams
    difficulty: ActionDifficulty
    estimated_impact: float  # 預估影響金額
    status: RecommendationStatus = RecommendationStatus.PENDING


def calculate_priority_score(
    severity: IssueSeverity,
    estimated_impact: float,
    difficulty: ActionDifficulty,
    affected_entities_count: int,
) -> int:
    """
    計算建議優先級分數

    公式：嚴重度基礎分 + 金額影響分 + 修復難度分 + 影響範圍分

    Args:
        severity: 問題嚴重程度
        estimated_impact: 預估影響金額
        difficulty: 修復難度
        affected_entities_count: 受影響實體數量

    Returns:
        int: 優先級分數

    Example:
        >>> score = calculate_priority_score(
        ...     severity=IssueSeverity.HIGH,
        ...     estimated_impact=300,
        ...     difficulty=ActionDifficulty.ONE_CLICK,
        ...     affected_entities_count=5,
        ... )
        >>> score
        128  # 70 + 3 + 30 + 25
    """
    # 嚴重度基礎分
    severity_score = SEVERITY_BASE_SCORES.get(severity, 20)

    # 金額影響分：預估影響金額 / 100（上限 50 分）
    impact_score = min(MAX_IMPACT_SCORE, estimated_impact / 100)

    # 修復難度分
    difficulty_score = DIFFICULTY_SCORES.get(difficulty, 0)

    # 影響範圍分：每個受影響實體 +5 分
    entity_scope_score = affected_entities_count * ENTITY_SCORE

    return round(severity_score + impact_score + difficulty_score + entity_scope_score)


def get_action_module_for_issue(issue: AuditIssue) -> ActionModule:
    """
    根據問題類型取得對應的執行模組

    Args:
        issue: 問題

    Returns:
        ActionModule: 執行模組
    """
    code = issue.code

    # 素材相關問題
    if code in ("CREATIVE_FATIGUE", "HIGH_FREQUENCY", "STALE_CREATIVE"):
        return ActionModule.PAUSE_CREATIVE

    # 受眾相關問題
    if code in ("HIGH_OVERLAP", "NO_EXCLUSION"):
        return ActionModule.ADD_EXCLUSION

    if code in ("SIZE_TOO_SMALL", "SIZE_TOO_LARGE", "STALE_AUDIENCE"):
        return ActionModule.UPDATE_AUDIENCE

    # 預算相關問題
    if code in ("INEFFICIENT_ALLOCATION", "LOW_SPEND_RATE", "OVERSPEND"):
        return ActionModule.ADJUST_BUDGET

    if code == "LEARNING_PHASE_BUDGET":
        return ActionModule.ADJUST_BUDGET

    # 活動/廣告組相關問題
    if code in ("TOO_MANY_ADSETS", "AUDIENCE_COMPETITION"):
        return ActionModule.PAUSE_ADSET

    # 其他問題需要手動處理
    return ActionModule.MANUAL_FIX


def get_difficulty_for_action(action_module: ActionModule) -> ActionDifficulty:
    """
    根據執行模組取得修復難度

    Args:
        action_module: 執行模組

    Returns:
        ActionDifficulty: 修復難度
    """
    # 一鍵操作
    if action_module in (
        ActionModule.PAUSE_CREATIVE,
        ActionModule.ENABLE_CREATIVE,
        ActionModule.PAUSE_CAMPAIGN,
        ActionModule.ENABLE_CAMPAIGN,
        ActionModule.PAUSE_ADSET,
        ActionModule.ENABLE_ADSET,
    ):
        return ActionDifficulty.ONE_CLICK

    # 簡單操作
    if action_module in (ActionModule.ADD_EXCLUSION,):
        return ActionDifficulty.SIMPLE

    # 中等操作
    if action_module in (ActionModule.ADJUST_BUDGET, ActionModule.UPDATE_AUDIENCE):
        return ActionDifficulty.MEDIUM

    # 複雜操作
    return ActionDifficulty.COMPLEX


def estimate_impact(issue: AuditIssue, spend: float = 0) -> float:
    """
    估算問題的影響金額

    簡化版：根據問題嚴重程度和花費估算

    Args:
        issue: 問題
        spend: 相關實體的花費金額

    Returns:
        float: 預估影響金額
    """
    # 基於嚴重程度的影響百分比
    severity_impact = {
        IssueSeverity.CRITICAL: 0.30,  # 30% 影響
        IssueSeverity.HIGH: 0.20,      # 20% 影響
        IssueSeverity.MEDIUM: 0.10,    # 10% 影響
        IssueSeverity.LOW: 0.05,       # 5% 影響
    }

    impact_rate = severity_impact.get(issue.severity, 0.05)
    return spend * impact_rate


def create_recommendation_from_issue(
    issue: AuditIssue,
    spend: float = 0,
    affected_entities: list[str] | None = None,
) -> Recommendation:
    """
    根據問題建立建議

    Args:
        issue: 問題
        spend: 相關實體的花費金額
        affected_entities: 受影響的實體 ID 列表

    Returns:
        Recommendation: 建議

    Example:
        >>> from app.services.audit_engine import CREATIVE_ISSUES
        >>> issue = CREATIVE_ISSUES["CREATIVE_FATIGUE"]
        >>> rec = create_recommendation_from_issue(
        ...     issue=issue,
        ...     spend=1000,
        ...     affected_entities=["creative_001", "creative_002"],
        ... )
        >>> rec.priority_score
        135  # 70 + 10 + 30 + 10
    """
    entities = affected_entities or []
    action_module = get_action_module_for_issue(issue)
    difficulty = get_difficulty_for_action(action_module)
    estimated_impact = estimate_impact(issue, spend)

    priority_score = calculate_priority_score(
        severity=issue.severity,
        estimated_impact=estimated_impact,
        difficulty=difficulty,
        affected_entities_count=len(entities),
    )

    # 建立執行參數
    action_params = ActionParams(
        target_type=issue.category.value,
        target_id=entities[0] if entities else "",
        action=action_module.value,
        params={"affected_entities": entities},
    )

    return Recommendation(
        id=str(uuid4()),
        issue=issue,
        priority_score=priority_score,
        title=f"處理: {issue.title}",
        description=issue.solution,
        action_module=action_module,
        action_params=action_params,
        difficulty=difficulty,
        estimated_impact=estimated_impact,
    )


def generate_recommendations_from_issues(
    issues: list[AuditIssue],
    spend_by_entity: dict[str, float] | None = None,
) -> list[Recommendation]:
    """
    根據問題列表生成建議

    Args:
        issues: 問題列表
        spend_by_entity: 各實體的花費金額

    Returns:
        list[Recommendation]: 按優先級排序的建議列表
    """
    spend_map = spend_by_entity or {}
    recommendations = []

    for issue in issues:
        # 取得受影響實體
        entities = []
        if issue.affected_entities:
            entities = issue.affected_entities.get("ids", [])

        # 計算花費
        total_spend = sum(spend_map.get(e, 0) for e in entities)

        rec = create_recommendation_from_issue(
            issue=issue,
            spend=total_spend,
            affected_entities=entities,
        )
        recommendations.append(rec)

    # 按優先級分數排序（高到低）
    recommendations.sort(key=lambda r: r.priority_score, reverse=True)

    return recommendations


def filter_recommendations(
    recommendations: list[Recommendation],
    status: RecommendationStatus | None = None,
    min_priority: int | None = None,
    max_count: int | None = None,
) -> list[Recommendation]:
    """
    篩選建議

    Args:
        recommendations: 建議列表
        status: 篩選特定狀態
        min_priority: 最低優先級分數
        max_count: 最多返回數量

    Returns:
        list[Recommendation]: 篩選後的建議列表
    """
    result = recommendations

    if status is not None:
        result = [r for r in result if r.status == status]

    if min_priority is not None:
        result = [r for r in result if r.priority_score >= min_priority]

    if max_count is not None:
        result = result[:max_count]

    return result
