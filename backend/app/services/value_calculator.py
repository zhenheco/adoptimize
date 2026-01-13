# -*- coding: utf-8 -*-
"""
成效價值計算器

計算使用 AdOptimize 平台節省的時間和獲得的投資報酬率。

計算指標：
- 節省時間：根據執行的動作數量和類型估算
- 浪費預算節省：根據優化建議估算
- ROI：(節省金額 + 效能提升) / 訂閱費用
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class ActionType(str, Enum):
    """動作類型"""

    PAUSE_CREATIVE = "PAUSE_CREATIVE"
    ADJUST_BUDGET = "ADJUST_BUDGET"
    ADD_EXCLUSION = "ADD_EXCLUSION"
    MANUAL_FIX = "MANUAL_FIX"
    PAUSE_CAMPAIGN = "PAUSE_CAMPAIGN"
    ENABLE_CREATIVE = "ENABLE_CREATIVE"


# 每種動作類型估計節省的時間（分鐘）
ACTION_TIME_SAVINGS: dict[ActionType, int] = {
    ActionType.PAUSE_CREATIVE: 5,
    ActionType.ADJUST_BUDGET: 10,
    ActionType.ADD_EXCLUSION: 15,
    ActionType.MANUAL_FIX: 30,
    ActionType.PAUSE_CAMPAIGN: 5,
    ActionType.ENABLE_CREATIVE: 3,
}

# 每種動作類型估計節省的金額（美元，佔影響金額的百分比）
ACTION_SAVINGS_RATE: dict[ActionType, float] = {
    ActionType.PAUSE_CREATIVE: 0.8,  # 暫停疲勞素材可節省 80% 的浪費
    ActionType.ADJUST_BUDGET: 0.5,   # 調整預算可節省 50% 的浪費
    ActionType.ADD_EXCLUSION: 0.7,   # 添加排除可節省 70% 的重疊浪費
    ActionType.MANUAL_FIX: 0.3,      # 手動修復平均節省 30%
    ActionType.PAUSE_CAMPAIGN: 0.9,  # 暫停低效活動節省 90%
    ActionType.ENABLE_CREATIVE: 0.0, # 啟用素材不節省，是增值
}


class ActionSummary(BaseModel):
    """動作摘要"""

    action_type: str
    count: int
    estimated_impact: Decimal  # 估計影響金額


class ValueInput(BaseModel):
    """價值計算輸入"""

    period_start: date
    period_end: date
    actions: list[ActionSummary]
    total_ad_spend: Decimal  # 期間總廣告花費
    subscription_cost: Decimal  # 訂閱費用


class ValueReport(BaseModel):
    """價值報告"""

    period_start: date
    period_end: date

    # 時間節省
    total_actions: int
    time_saved_minutes: int
    time_saved_hours: float

    # 金額節省
    estimated_savings: Decimal
    savings_percentage: float  # 相對於總廣告花費

    # ROI
    subscription_cost: Decimal
    roi_percentage: float  # (節省金額 - 訂閱費用) / 訂閱費用 * 100

    # 詳細分解
    breakdown: list[dict]


def calculate_time_saved(actions: list[ActionSummary]) -> int:
    """
    計算節省的時間（分鐘）

    Args:
        actions: 動作摘要列表

    Returns:
        總節省時間（分鐘）
    """
    total_minutes = 0

    for action in actions:
        try:
            action_type = ActionType(action.action_type)
            time_per_action = ACTION_TIME_SAVINGS.get(action_type, 5)
            total_minutes += time_per_action * action.count
        except ValueError:
            # 未知動作類型，使用預設值
            total_minutes += 5 * action.count

    return total_minutes


def calculate_estimated_savings(actions: list[ActionSummary]) -> Decimal:
    """
    計算估計節省金額

    Args:
        actions: 動作摘要列表

    Returns:
        估計節省金額
    """
    total_savings = Decimal("0")

    for action in actions:
        try:
            action_type = ActionType(action.action_type)
            savings_rate = ACTION_SAVINGS_RATE.get(action_type, 0.3)
            savings = action.estimated_impact * Decimal(str(savings_rate))
            total_savings += savings
        except ValueError:
            # 未知動作類型，使用預設比率
            total_savings += action.estimated_impact * Decimal("0.3")

    return total_savings.quantize(Decimal("0.01"))


def calculate_roi(
    estimated_savings: Decimal,
    subscription_cost: Decimal,
) -> float:
    """
    計算投資報酬率

    ROI = (節省金額 - 訂閱費用) / 訂閱費用 * 100

    Args:
        estimated_savings: 估計節省金額
        subscription_cost: 訂閱費用

    Returns:
        ROI 百分比
    """
    if subscription_cost <= 0:
        return 0.0

    roi = (float(estimated_savings) - float(subscription_cost)) / float(subscription_cost) * 100
    return round(roi, 1)


def generate_value_report(input_data: ValueInput) -> ValueReport:
    """
    產生價值報告

    Args:
        input_data: 價值計算輸入

    Returns:
        ValueReport: 價值報告
    """
    # 計算總動作數
    total_actions = sum(action.count for action in input_data.actions)

    # 計算時間節省
    time_saved_minutes = calculate_time_saved(input_data.actions)
    time_saved_hours = round(time_saved_minutes / 60, 1)

    # 計算金額節省
    estimated_savings = calculate_estimated_savings(input_data.actions)

    # 計算節省百分比
    if input_data.total_ad_spend > 0:
        savings_percentage = float(estimated_savings / input_data.total_ad_spend * 100)
    else:
        savings_percentage = 0.0

    # 計算 ROI
    roi_percentage = calculate_roi(estimated_savings, input_data.subscription_cost)

    # 產生分解明細
    breakdown = []
    for action in input_data.actions:
        try:
            action_type = ActionType(action.action_type)
            time_per_action = ACTION_TIME_SAVINGS.get(action_type, 5)
            savings_rate = ACTION_SAVINGS_RATE.get(action_type, 0.3)
        except ValueError:
            time_per_action = 5
            savings_rate = 0.3

        action_time_saved = time_per_action * action.count
        action_savings = action.estimated_impact * Decimal(str(savings_rate))

        breakdown.append({
            "action_type": action.action_type,
            "count": action.count,
            "time_saved_minutes": action_time_saved,
            "estimated_impact": float(action.estimated_impact),
            "estimated_savings": float(action_savings),
        })

    return ValueReport(
        period_start=input_data.period_start,
        period_end=input_data.period_end,
        total_actions=total_actions,
        time_saved_minutes=time_saved_minutes,
        time_saved_hours=time_saved_hours,
        estimated_savings=estimated_savings,
        savings_percentage=round(savings_percentage, 2),
        subscription_cost=input_data.subscription_cost,
        roi_percentage=roi_percentage,
        breakdown=breakdown,
    )


def generate_monthly_report(
    year: int,
    month: int,
    actions: list[ActionSummary],
    total_ad_spend: Decimal,
    subscription_cost: Decimal,
) -> ValueReport:
    """
    產生月度價值報告

    Args:
        year: 年份
        month: 月份
        actions: 動作摘要列表
        total_ad_spend: 總廣告花費
        subscription_cost: 訂閱費用

    Returns:
        ValueReport: 月度價值報告
    """
    # 計算月份的起始和結束日期
    period_start = date(year, month, 1)
    if month == 12:
        period_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        period_end = date(year, month + 1, 1) - timedelta(days=1)

    input_data = ValueInput(
        period_start=period_start,
        period_end=period_end,
        actions=actions,
        total_ad_spend=total_ad_spend,
        subscription_cost=subscription_cost,
    )

    return generate_value_report(input_data)


def estimate_annual_value(monthly_reports: list[ValueReport]) -> dict:
    """
    估算年度價值

    Args:
        monthly_reports: 月度報告列表

    Returns:
        年度價值摘要
    """
    if not monthly_reports:
        return {
            "total_actions": 0,
            "total_time_saved_hours": 0.0,
            "total_estimated_savings": Decimal("0"),
            "average_monthly_roi": 0.0,
            "total_subscription_cost": Decimal("0"),
        }

    total_actions = sum(r.total_actions for r in monthly_reports)
    total_time_minutes = sum(r.time_saved_minutes for r in monthly_reports)
    total_savings = sum(r.estimated_savings for r in monthly_reports)
    total_subscription = sum(r.subscription_cost for r in monthly_reports)

    avg_roi = sum(r.roi_percentage for r in monthly_reports) / len(monthly_reports)

    return {
        "total_actions": total_actions,
        "total_time_saved_hours": round(total_time_minutes / 60, 1),
        "total_estimated_savings": total_savings,
        "average_monthly_roi": round(avg_roi, 1),
        "total_subscription_cost": total_subscription,
    }
