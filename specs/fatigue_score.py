# -*- coding: utf-8 -*-
"""
素材疲勞度計算模組

根據 specs/requirements.md 定義的疲勞度公式

公式：疲勞度 = CTR變化權重(40%) + 投放頻率權重(30%) + 投放天數權重(20%) + 轉換率變化權重(10%)

疲勞警示門檻：
- 🟢 健康 (0-40): 持續投放
- 🟡 注意 (41-70): 準備替換素材
- 🔴 疲勞 (71-100): 立即更換素材

INSTRUCTION: Copy this file to backend/app/services/fatigue_score.py
Run: cp specs/fatigue_score.py backend/app/services/fatigue_score.py
"""

from dataclasses import dataclass
from enum import Enum


class FatigueStatus(str, Enum):
    """疲勞狀態"""

    HEALTHY = "healthy"
    WARNING = "warning"
    FATIGUED = "fatigued"


# 權重常數
FATIGUE_WEIGHTS = {
    "ctr": 0.4,
    "frequency": 0.3,
    "days": 0.2,
    "conversion": 0.1,
}

# 門檻常數
FATIGUE_THRESHOLDS = {
    "healthy": 40,
    "warning": 70,
}


@dataclass
class FatigueInput:
    """疲勞計算輸入參數"""

    ctr_change: float  # CTR 變化率（%），負值表示下降
    frequency: float  # 平均投放頻率（次/人）
    days_active: int  # 投放天數
    conversion_rate_change: float  # 轉換率變化率（%），負值表示下降


@dataclass
class FatigueBreakdown:
    """各因子分數明細"""

    ctr_score: float
    frequency_score: float
    days_score: float
    conversion_score: float


@dataclass
class FatigueResult:
    """疲勞計算結果"""

    score: int  # 疲勞分數 (0-100)
    status: FatigueStatus  # 疲勞狀態
    breakdown: FatigueBreakdown  # 各因子分數明細


def calculate_ctr_score(ctr_change: float) -> float:
    """
    計算 CTR 變化因子分數 (0-100)

    | 分數範圍 | CTR 變化 |
    |---------|----------|
    | 0-25    | > 0%     |
    | 26-50   | 0% ~ -10%|
    | 51-75   | -10% ~ -20%|
    | 76-100  | < -20%   |

    Args:
        ctr_change: CTR 變化率（%），負值表示下降

    Returns:
        float: 因子分數 (0-100)
    """
    if ctr_change > 0:
        return 0
    if ctr_change >= -10:
        return 25 + (-ctr_change / 10) * 25
    if ctr_change >= -20:
        return 50 + ((-ctr_change - 10) / 10) * 25
    return min(100, 75 + ((-ctr_change - 20) / 10) * 25)


def calculate_frequency_score(frequency: float) -> float:
    """
    計算投放頻率因子分數 (0-100)

    | 分數範圍 | 頻率 |
    |---------|------|
    | 0-25    | < 2  |
    | 26-50   | 2-3  |
    | 51-75   | 3-4  |
    | 76-100  | > 4  |

    Args:
        frequency: 平均投放頻率（次/人）

    Returns:
        float: 因子分數 (0-100)
    """
    if frequency < 2:
        return (frequency / 2) * 25
    if frequency < 3:
        return 25 + ((frequency - 2) / 1) * 25
    if frequency < 4:
        return 50 + ((frequency - 3) / 1) * 25
    return min(100, 75 + ((frequency - 4) / 2) * 25)


def calculate_days_score(days_active: int) -> float:
    """
    計算投放天數因子分數 (0-100)

    | 分數範圍 | 天數 |
    |---------|------|
    | 0-25    | < 7 天 |
    | 26-50   | 7-14 天 |
    | 51-75   | 14-30 天 |
    | 76-100  | > 30 天 |

    Args:
        days_active: 投放天數

    Returns:
        float: 因子分數 (0-100)
    """
    if days_active < 7:
        return (days_active / 7) * 25
    if days_active < 14:
        return 25 + ((days_active - 7) / 7) * 25
    if days_active < 30:
        return 50 + ((days_active - 14) / 16) * 25
    return min(100, 75 + ((days_active - 30) / 30) * 25)


def calculate_conversion_score(conversion_rate_change: float) -> float:
    """
    計算轉換率變化因子分數 (0-100)

    | 分數範圍 | 轉換率變化 |
    |---------|----------|
    | 0-25    | > 0%     |
    | 26-50   | 0% ~ -10%|
    | 51-75   | -10% ~ -20%|
    | 76-100  | < -20%   |

    Args:
        conversion_rate_change: 轉換率變化率（%），負值表示下降

    Returns:
        float: 因子分數 (0-100)
    """
    if conversion_rate_change > 0:
        return 0
    if conversion_rate_change >= -10:
        return 25 + (-conversion_rate_change / 10) * 25
    if conversion_rate_change >= -20:
        return 50 + ((-conversion_rate_change - 10) / 10) * 25
    return min(100, 75 + ((-conversion_rate_change - 20) / 10) * 25)


def get_fatigue_status(score: int) -> FatigueStatus:
    """
    根據分數取得疲勞狀態

    Args:
        score: 疲勞分數 (0-100)

    Returns:
        FatigueStatus: 疲勞狀態
    """
    if score <= FATIGUE_THRESHOLDS["healthy"]:
        return FatigueStatus.HEALTHY
    if score <= FATIGUE_THRESHOLDS["warning"]:
        return FatigueStatus.WARNING
    return FatigueStatus.FATIGUED


def calculate_fatigue_score(fatigue_input: FatigueInput) -> FatigueResult:
    """
    計算素材疲勞度

    根據四個因子計算加權平均疲勞分數

    Args:
        fatigue_input: 疲勞計算輸入參數

    Returns:
        FatigueResult: 疲勞計算結果，包含分數、狀態和明細

    Example:
        >>> input = FatigueInput(
        ...     ctr_change=-15,      # CTR 下降 15%
        ...     frequency=3.2,       # 平均曝光 3.2 次/人
        ...     days_active=21,      # 投放 21 天
        ...     conversion_rate_change=-5, # 轉換率下降 5%
        ... )
        >>> result = calculate_fatigue_score(input)
        >>> result.score
        56
        >>> result.status
        <FatigueStatus.WARNING: 'warning'>
    """
    ctr_score = calculate_ctr_score(fatigue_input.ctr_change)
    frequency_score = calculate_frequency_score(fatigue_input.frequency)
    days_score = calculate_days_score(fatigue_input.days_active)
    conversion_score = calculate_conversion_score(fatigue_input.conversion_rate_change)

    score = round(
        ctr_score * FATIGUE_WEIGHTS["ctr"]
        + frequency_score * FATIGUE_WEIGHTS["frequency"]
        + days_score * FATIGUE_WEIGHTS["days"]
        + conversion_score * FATIGUE_WEIGHTS["conversion"]
    )

    return FatigueResult(
        score=score,
        status=get_fatigue_status(score),
        breakdown=FatigueBreakdown(
            ctr_score=ctr_score,
            frequency_score=frequency_score,
            days_score=days_score,
            conversion_score=conversion_score,
        ),
    )
