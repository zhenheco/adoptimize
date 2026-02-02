# -*- coding: utf-8 -*-
"""
計費配置

定義各方案的定價、抽成費率、AI 配額和計費操作
金額使用 TWD 整數，費率使用千分比（如 1000 = 10%）
"""

# 訂閱方案定價
PRICING_PLANS = {
    "free": {
        "monthly_fee": 0,  # 免月費
        "commission_rate": 1000,  # 10% 抽成
        "ai_audience_price": 200,  # AI 受眾分析每次 200 元
        "ai_copywriting_price": 5,  # AI 文案每次 5 元
        "ai_image_price": 10,  # AI 圖片每次 10 元
        "monthly_copywriting_quota": 0,  # 無免費配額
        "monthly_image_quota": 0,
    },
    "pro": {
        "monthly_fee": 1500,  # 月費 1500 元
        "commission_rate": 500,  # 5% 抽成
        "ai_audience_price": 200,
        "ai_copywriting_price": 5,
        "ai_image_price": 10,
        "monthly_copywriting_quota": 50,  # 每月 50 次免費文案
        "monthly_image_quota": 10,  # 每月 10 次免費圖片
        "excess_copywriting_price": 5,  # 超額文案每次 5 元
        "excess_image_price": 10,  # 超額圖片每次 10 元
    },
    "agency": {
        "monthly_fee": 7500,  # 月費 7500 元
        "commission_rate": 300,  # 3% 抽成
        "ai_audience_price": 200,
        "ai_copywriting_price": 3,  # 較便宜
        "ai_image_price": 8,
        "monthly_copywriting_quota": -1,  # -1 代表無限
        "monthly_image_quota": 50,
        "excess_copywriting_price": 3,
        "excess_image_price": 8,
    },
}

# 計費操作定義
# True = 需要計費（計算抽成）
# False = 免費操作
BILLABLE_ACTIONS = {
    # 建立操作（計費）
    "CREATE_CAMPAIGN": True,
    "CREATE_ADSET": True,
    "CREATE_AD": True,
    "DUPLICATE_CAMPAIGN": True,
    "DUPLICATE_ADSET": True,
    "DUPLICATE_AD": True,

    # 預算相關（計費）
    "UPDATE_BUDGET": True,

    # 狀態變更（免費）
    "PAUSE": False,
    "ENABLE": False,
    "ARCHIVE": False,

    # 編輯操作（免費）
    "UPDATE_COPY": False,
    "UPDATE_TARGETING": False,
    "UPDATE_BID": False,
}


def get_plan_config(plan: str) -> dict:
    """
    取得方案配置

    Args:
        plan: 方案名稱（free, pro, agency）

    Returns:
        dict: 方案配置
    """
    return PRICING_PLANS.get(plan, PRICING_PLANS["free"])


def is_billable_action(action_type: str) -> bool:
    """
    檢查操作是否需要計費

    Args:
        action_type: 操作類型

    Returns:
        bool: 是否需要計費
    """
    return BILLABLE_ACTIONS.get(action_type, False)


def calculate_commission(ad_spend: int, commission_rate: int) -> int:
    """
    計算抽成金額

    Args:
        ad_spend: 廣告花費金額（TWD 整數）
        commission_rate: 抽成費率（千分比，如 1000 = 10%）

    Returns:
        int: 抽成金額（TWD 整數）
    """
    # commission = ad_spend * commission_rate / 10000
    return ad_spend * commission_rate // 10000
