# -*- coding: utf-8 -*-
"""
一鍵執行與智慧建議次數限制器

根據用戶訂閱層級限制每月操作次數和功能存取。

訂閱層級與限制對照：
=== 一鍵執行 ===
- STARTER: 每月 10 次
- PROFESSIONAL: 無限制
- AGENCY: 無限制
- ENTERPRISE: 無限制

=== 智慧建議 ===
- STARTER: 每月 3 次，僅能看摘要
- PROFESSIONAL: 每月 5 次，完整報告+建立受眾
- AGENCY: 無限制，完整功能+建立廣告
- ENTERPRISE: 無限制，完整功能+API 存取
"""

from dataclasses import dataclass
from datetime import date, datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class SubscriptionTier(str, Enum):
    """訂閱層級"""

    STARTER = "STARTER"
    PROFESSIONAL = "PROFESSIONAL"
    AGENCY = "AGENCY"
    ENTERPRISE = "ENTERPRISE"


class ActionType(str, Enum):
    """操作類型"""

    ONE_CLICK_EXECUTE = "one_click_execute"  # 一鍵執行
    SUGGESTION_GENERATE = "suggestion_generate"  # 生成智慧建議
    SUGGESTION_EXECUTE = "suggestion_execute"  # 執行建議（建立受眾/廣告）


# 每月一鍵執行次數限制
ACTION_LIMITS: dict[SubscriptionTier, Optional[int]] = {
    SubscriptionTier.STARTER: 10,
    SubscriptionTier.PROFESSIONAL: None,  # 無限制
    SubscriptionTier.AGENCY: None,
    SubscriptionTier.ENTERPRISE: None,
}

# 每月智慧建議生成次數限制
SUGGESTION_LIMITS: dict[SubscriptionTier, Optional[int]] = {
    SubscriptionTier.STARTER: 3,
    SubscriptionTier.PROFESSIONAL: 5,
    SubscriptionTier.AGENCY: None,  # 無限制
    SubscriptionTier.ENTERPRISE: None,
}


@dataclass
class TierFeatures:
    """訂閱層級功能權限"""

    can_view_full_report: bool  # 是否可看完整建議報告
    can_create_audience: bool  # 是否可建立 Meta 受眾
    can_create_ad: bool  # 是否可建立 Meta 廣告
    has_api_access: bool  # 是否有 API 存取權限
    max_visible_interests: int  # 可見的興趣標籤數量


# 各層級功能權限
TIER_FEATURES: dict[SubscriptionTier, TierFeatures] = {
    SubscriptionTier.STARTER: TierFeatures(
        can_view_full_report=False,
        can_create_audience=False,
        can_create_ad=False,
        has_api_access=False,
        max_visible_interests=2,  # 僅能看前 2 個標籤
    ),
    SubscriptionTier.PROFESSIONAL: TierFeatures(
        can_view_full_report=True,
        can_create_audience=True,
        can_create_ad=False,
        has_api_access=False,
        max_visible_interests=10,  # 完整 10 個標籤
    ),
    SubscriptionTier.AGENCY: TierFeatures(
        can_view_full_report=True,
        can_create_audience=True,
        can_create_ad=True,
        has_api_access=False,
        max_visible_interests=10,
    ),
    SubscriptionTier.ENTERPRISE: TierFeatures(
        can_view_full_report=True,
        can_create_audience=True,
        can_create_ad=True,
        has_api_access=True,
        max_visible_interests=10,
    ),
}


class ActionLimitInput(BaseModel):
    """執行限制輸入"""

    subscription_tier: SubscriptionTier
    current_count: int
    count_reset_at: date


class ActionLimitResult(BaseModel):
    """執行限制結果"""

    can_execute: bool
    remaining_actions: Optional[int]  # None 表示無限制
    limit: Optional[int]
    current_count: int
    resets_at: date
    message: str


def get_action_limit(tier: SubscriptionTier) -> Optional[int]:
    """
    取得指定訂閱層級的執行次數限制

    Args:
        tier: 訂閱層級

    Returns:
        執行次數限制，None 表示無限制
    """
    return ACTION_LIMITS.get(tier, ACTION_LIMITS[SubscriptionTier.STARTER])


def should_reset_count(count_reset_at: date) -> bool:
    """
    判斷是否應該重置計數

    每月 1 日重置

    Args:
        count_reset_at: 計數重置日期

    Returns:
        是否應該重置
    """
    today = date.today()

    # 如果重置日期的年月小於當前年月，需要重置
    if (count_reset_at.year, count_reset_at.month) < (today.year, today.month):
        return True

    return False


def get_next_reset_date() -> date:
    """
    取得下次計數重置日期（下個月 1 日）

    Returns:
        下次重置日期
    """
    today = date.today()

    # 計算下個月的第一天
    if today.month == 12:
        return date(today.year + 1, 1, 1)
    else:
        return date(today.year, today.month + 1, 1)


def check_action_limit(
    tier: SubscriptionTier,
    current_count: int,
    count_reset_at: Optional[date] = None,
) -> ActionLimitResult:
    """
    檢查是否可以執行一鍵操作

    Args:
        tier: 訂閱層級
        current_count: 當月已執行次數
        count_reset_at: 計數重置日期

    Returns:
        ActionLimitResult: 包含是否可執行及相關資訊
    """
    limit = get_action_limit(tier)
    today = date.today()

    # 檢查是否需要重置
    if count_reset_at and should_reset_count(count_reset_at):
        current_count = 0
        count_reset_at = today

    # 無限制
    if limit is None:
        return ActionLimitResult(
            can_execute=True,
            remaining_actions=None,
            limit=None,
            current_count=current_count,
            resets_at=get_next_reset_date(),
            message="您的方案無執行次數限制",
        )

    # 有限制
    remaining = limit - current_count

    if remaining > 0:
        return ActionLimitResult(
            can_execute=True,
            remaining_actions=remaining,
            limit=limit,
            current_count=current_count,
            resets_at=get_next_reset_date(),
            message=f"本月剩餘 {remaining} 次執行次數",
        )

    return ActionLimitResult(
        can_execute=False,
        remaining_actions=0,
        limit=limit,
        current_count=current_count,
        resets_at=get_next_reset_date(),
        message=f"本月執行次數已達上限 ({limit} 次)，將於 {get_next_reset_date()} 重置",
    )


def increment_action_count(
    current_count: int,
    count_reset_at: Optional[date] = None,
) -> tuple[int, date]:
    """
    遞增執行次數

    如果需要重置，會先重置再遞增。

    Args:
        current_count: 當前計數
        count_reset_at: 計數重置日期

    Returns:
        (新計數, 重置日期)
    """
    today = date.today()

    # 檢查是否需要重置
    if count_reset_at and should_reset_count(count_reset_at):
        return 1, today

    return current_count + 1, count_reset_at or today


def can_execute_action(
    tier: str,
    current_count: int,
    count_reset_at: Optional[date] = None,
) -> bool:
    """
    簡化版本：直接返回是否可執行

    Args:
        tier: 訂閱層級字串
        current_count: 當月已執行次數
        count_reset_at: 計數重置日期

    Returns:
        是否可以執行
    """
    try:
        subscription_tier = SubscriptionTier(tier.upper())
    except ValueError:
        subscription_tier = SubscriptionTier.STARTER

    result = check_action_limit(subscription_tier, current_count, count_reset_at)
    return result.can_execute


def get_tier_from_string(tier_string: str) -> SubscriptionTier:
    """
    從字串轉換為訂閱層級枚舉

    Args:
        tier_string: 訂閱層級字串

    Returns:
        SubscriptionTier 枚舉值
    """
    try:
        return SubscriptionTier(tier_string.upper())
    except ValueError:
        return SubscriptionTier.STARTER


# ============================================================
# 智慧建議相關函數
# ============================================================


class SuggestionLimitResult(BaseModel):
    """智慧建議限制結果"""

    can_generate: bool
    remaining_suggestions: Optional[int]  # None 表示無限制
    limit: Optional[int]
    current_count: int
    resets_at: date
    message: str
    features: dict  # 功能權限


def get_suggestion_limit(tier: SubscriptionTier) -> Optional[int]:
    """
    取得指定訂閱層級的智慧建議生成次數限制

    Args:
        tier: 訂閱層級

    Returns:
        生成次數限制，None 表示無限制
    """
    return SUGGESTION_LIMITS.get(tier, SUGGESTION_LIMITS[SubscriptionTier.STARTER])


def get_tier_features(tier: SubscriptionTier) -> TierFeatures:
    """
    取得指定訂閱層級的功能權限

    Args:
        tier: 訂閱層級

    Returns:
        TierFeatures 物件
    """
    return TIER_FEATURES.get(tier, TIER_FEATURES[SubscriptionTier.STARTER])


def check_suggestion_limit(
    tier: SubscriptionTier,
    current_count: int,
    count_reset_at: Optional[date] = None,
) -> SuggestionLimitResult:
    """
    檢查是否可以生成智慧建議

    Args:
        tier: 訂閱層級
        current_count: 當月已生成次數
        count_reset_at: 計數重置日期

    Returns:
        SuggestionLimitResult: 包含是否可生成及相關資訊
    """
    limit = get_suggestion_limit(tier)
    features = get_tier_features(tier)

    # 檢查是否需要重置
    if count_reset_at and should_reset_count(count_reset_at):
        current_count = 0

    # 將功能權限轉為 dict
    features_dict = {
        "can_view_full_report": features.can_view_full_report,
        "can_create_audience": features.can_create_audience,
        "can_create_ad": features.can_create_ad,
        "has_api_access": features.has_api_access,
        "max_visible_interests": features.max_visible_interests,
    }

    # 無限制
    if limit is None:
        return SuggestionLimitResult(
            can_generate=True,
            remaining_suggestions=None,
            limit=None,
            current_count=current_count,
            resets_at=get_next_reset_date(),
            message="您的方案無建議生成次數限制",
            features=features_dict,
        )

    # 有限制
    remaining = limit - current_count

    if remaining > 0:
        return SuggestionLimitResult(
            can_generate=True,
            remaining_suggestions=remaining,
            limit=limit,
            current_count=current_count,
            resets_at=get_next_reset_date(),
            message=f"本月剩餘 {remaining} 次建議生成次數",
            features=features_dict,
        )

    return SuggestionLimitResult(
        can_generate=False,
        remaining_suggestions=0,
        limit=limit,
        current_count=current_count,
        resets_at=get_next_reset_date(),
        message=f"本月建議生成次數已達上限 ({limit} 次)，將於 {get_next_reset_date()} 重置",
        features=features_dict,
    )


def increment_suggestion_count(
    current_count: int,
    count_reset_at: Optional[date] = None,
) -> tuple[int, date]:
    """
    遞增智慧建議生成次數

    如果需要重置，會先重置再遞增。

    Args:
        current_count: 當前計數
        count_reset_at: 計數重置日期

    Returns:
        (新計數, 重置日期)
    """
    today = date.today()

    # 檢查是否需要重置
    if count_reset_at and should_reset_count(count_reset_at):
        return 1, today

    return current_count + 1, count_reset_at or today


def can_generate_suggestion(
    tier: str,
    current_count: int,
    count_reset_at: Optional[date] = None,
) -> bool:
    """
    簡化版本：直接返回是否可生成智慧建議

    Args:
        tier: 訂閱層級字串
        current_count: 當月已生成次數
        count_reset_at: 計數重置日期

    Returns:
        是否可以生成
    """
    subscription_tier = get_tier_from_string(tier)
    result = check_suggestion_limit(subscription_tier, current_count, count_reset_at)
    return result.can_generate


def filter_suggestion_by_tier(
    suggestion_data: dict,
    tier: SubscriptionTier,
) -> dict:
    """
    根據訂閱層級過濾建議內容

    STARTER 用戶只能看前 2 個興趣標籤，且看不到完整推薦理由。

    Args:
        suggestion_data: 完整的建議資料
        tier: 訂閱層級

    Returns:
        過濾後的建議資料
    """
    features = get_tier_features(tier)

    # 複製資料避免修改原始物件
    filtered = suggestion_data.copy()

    if not features.can_view_full_report:
        # STARTER 用戶：限制可見內容
        interests = filtered.get("suggested_interests", [])

        if len(interests) > features.max_visible_interests:
            # 只保留前 N 個標籤
            visible_interests = interests[: features.max_visible_interests]

            # 遮蔽詳細原因
            for interest in visible_interests:
                if isinstance(interest, dict):
                    interest["reason"] = "[升級以查看完整說明]"

            filtered["suggested_interests"] = visible_interests
            filtered["hidden_interests_count"] = len(interests) - features.max_visible_interests

        # 截斷推薦理由
        reasoning = filtered.get("reasoning", "")
        if reasoning and len(reasoning) > 100:
            filtered["reasoning"] = reasoning[:100] + "... [升級以查看完整分析]"

        # 隱藏預算分配和素材推薦
        filtered["budget_allocation"] = None
        filtered["creative_recommendations"] = None
        filtered["suggested_ad_copy"] = None

    # 標記可用功能
    filtered["can_view_full"] = features.can_view_full_report
    filtered["can_create_audience"] = features.can_create_audience
    filtered["can_create_ad"] = features.can_create_ad

    return filtered


def can_execute_suggestion_action(
    tier: str,
    action: str,
) -> tuple[bool, str]:
    """
    檢查是否可以執行建議操作（建立受眾/廣告）

    Args:
        tier: 訂閱層級字串
        action: 操作類型 ('create_audience' 或 'create_ad')

    Returns:
        (是否可執行, 訊息)
    """
    subscription_tier = get_tier_from_string(tier)
    features = get_tier_features(subscription_tier)

    if action == "create_audience":
        if features.can_create_audience:
            return True, "可以建立受眾"
        return False, "升級至 Professional 方案以使用一鍵建立受眾功能"

    if action == "create_ad":
        if features.can_create_ad:
            return True, "可以建立廣告"
        return False, "升級至 Agency 方案以使用一鍵建立廣告功能"

    return False, f"未知的操作類型: {action}"
