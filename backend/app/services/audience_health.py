# -*- coding: utf-8 -*-
"""
受眾健康度計算模組

根據 specs/requirements.md 定義的受眾健康度公式

公式：健康度 = 規模(25%) + CPA表現(35%) + ROAS表現(25%) + 新鮮度(15%)

健康警示門檻：
- 🟢 健康 (70-100): 表現良好
- 🟡 注意 (40-69): 需要關注
- 🔴 問題 (0-39): 需要立即處理
"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional


class AudienceHealthStatus(str, Enum):
    """受眾健康狀態"""

    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"


# 權重常數
AUDIENCE_HEALTH_WEIGHTS = {
    "size": 0.25,
    "cpa": 0.35,
    "roas": 0.25,
    "freshness": 0.15,
}

# 門檻常數
AUDIENCE_HEALTH_THRESHOLDS = {
    "healthy": 70,
    "warning": 40,
}

# 規模閾值
SIZE_THRESHOLDS = {
    "min_healthy": 10_000,  # 10K
    "max_healthy": 2_000_000,  # 2M
    "min_critical": 5_000,  # 5K
    "max_critical": 10_000_000,  # 10M
}

# CPA 閾值（相對於帳戶平均）
CPA_THRESHOLDS = {
    "good_ratio": 1.0,  # 低於或等於平均
    "warning_ratio": 1.3,  # 高於平均 30%
}

# ROAS 閾值
ROAS_THRESHOLDS = {
    "healthy": 1.5,  # > 1.5x
    "warning": 1.0,  # < 1.0x
}

# 新鮮度閾值（天數）
FRESHNESS_THRESHOLDS = {
    "healthy": 30,
    "warning": 60,
}


@dataclass
class AudienceHealthInput:
    """受眾健康計算輸入參數"""

    size: int  # 受眾規模
    cpa: float  # 受眾 CPA
    account_avg_cpa: float  # 帳戶平均 CPA
    roas: float  # 受眾 ROAS
    last_updated: Optional[datetime] = None  # 最後更新時間
    days_since_update: Optional[int] = None  # 距離上次更新天數（可選，會自動計算）


@dataclass
class AudienceHealthBreakdown:
    """各因子分數明細"""

    size_score: float
    cpa_score: float
    roas_score: float
    freshness_score: float


@dataclass
class AudienceHealthResult:
    """健康計算結果"""

    score: int  # 健康分數 (0-100)
    status: AudienceHealthStatus  # 健康狀態
    breakdown: AudienceHealthBreakdown  # 各因子分數明細


def calculate_size_score(size: int) -> float:
    """
    計算受眾規模因子分數 (0-100)

    | 分數範圍 | 規模 |
    |---------|------|
    | 100     | 10K - 2M (理想範圍) |
    | 50-99   | 5K-10K 或 2M-10M (可接受) |
    | 0-49    | < 5K 或 > 10M (問題) |

    Args:
        size: 受眾規模

    Returns:
        float: 因子分數 (0-100)
    """
    min_healthy = SIZE_THRESHOLDS["min_healthy"]
    max_healthy = SIZE_THRESHOLDS["max_healthy"]
    min_critical = SIZE_THRESHOLDS["min_critical"]
    max_critical = SIZE_THRESHOLDS["max_critical"]

    # 理想範圍
    if min_healthy <= size <= max_healthy:
        return 100

    # 過小
    if size < min_healthy:
        if size < min_critical:
            # 極端過小：線性從 0 到 25
            return max(0, (size / min_critical) * 25)
        else:
            # 稍微過小：線性從 50 到 100
            return 50 + ((size - min_critical) / (min_healthy - min_critical)) * 50

    # 過大
    if size > max_healthy:
        if size > max_critical:
            # 極端過大：線性從 25 到 0
            return max(0, 25 - ((size - max_critical) / max_critical) * 25)
        else:
            # 稍微過大：線性從 100 到 50
            return 100 - ((size - max_healthy) / (max_critical - max_healthy)) * 50

    return 50  # 預設


def calculate_cpa_score(cpa: float, account_avg_cpa: float) -> float:
    """
    計算 CPA 表現因子分數 (0-100)

    | 分數範圍 | CPA 相對於平均 |
    |---------|---------------|
    | 100     | 低於平均     |
    | 50-99   | 平均 ~ 平均+30% |
    | 0-49    | 高於平均 30%+ |

    Args:
        cpa: 受眾 CPA
        account_avg_cpa: 帳戶平均 CPA

    Returns:
        float: 因子分數 (0-100)
    """
    if account_avg_cpa <= 0:
        return 50  # 無法計算，返回中間值

    ratio = cpa / account_avg_cpa

    if ratio <= CPA_THRESHOLDS["good_ratio"]:
        # CPA 低於或等於平均：滿分
        return 100

    if ratio <= CPA_THRESHOLDS["warning_ratio"]:
        # CPA 高於平均但不超過 30%：線性從 100 到 50
        excess = ratio - 1.0
        return 100 - (excess / 0.3) * 50

    # CPA 高於平均 30% 以上：線性從 50 到 0
    excess = ratio - 1.3
    return max(0, 50 - (excess / 0.7) * 50)


def calculate_roas_score(roas: float) -> float:
    """
    計算 ROAS 表現因子分數 (0-100)

    | 分數範圍 | ROAS |
    |---------|------|
    | 100     | >= 1.5x |
    | 50-99   | 1.0x - 1.5x |
    | 0-49    | < 1.0x |

    Args:
        roas: 受眾 ROAS

    Returns:
        float: 因子分數 (0-100)
    """
    healthy = ROAS_THRESHOLDS["healthy"]
    warning = ROAS_THRESHOLDS["warning"]

    if roas >= healthy:
        return 100

    if roas >= warning:
        # ROAS 1.0-1.5：線性從 50 到 100
        return 50 + ((roas - warning) / (healthy - warning)) * 50

    # ROAS < 1.0：線性從 0 到 50
    if roas <= 0:
        return 0
    return (roas / warning) * 50


def calculate_freshness_score(days_since_update: int) -> float:
    """
    計算新鮮度因子分數 (0-100)

    | 分數範圍 | 更新天數 |
    |---------|---------|
    | 100     | < 30 天 |
    | 50-99   | 30-60 天 |
    | 0-49    | > 60 天 |

    Args:
        days_since_update: 距離上次更新天數

    Returns:
        float: 因子分數 (0-100)
    """
    healthy = FRESHNESS_THRESHOLDS["healthy"]
    warning = FRESHNESS_THRESHOLDS["warning"]

    if days_since_update <= healthy:
        return 100

    if days_since_update <= warning:
        # 30-60 天：線性從 100 到 50
        return 100 - ((days_since_update - healthy) / (warning - healthy)) * 50

    # > 60 天：線性從 50 到 0
    return max(0, 50 - ((days_since_update - warning) / warning) * 50)


def get_audience_health_status(score: int) -> AudienceHealthStatus:
    """
    根據分數取得健康狀態

    Args:
        score: 健康分數 (0-100)

    Returns:
        AudienceHealthStatus: 健康狀態
    """
    if score >= AUDIENCE_HEALTH_THRESHOLDS["healthy"]:
        return AudienceHealthStatus.HEALTHY
    if score >= AUDIENCE_HEALTH_THRESHOLDS["warning"]:
        return AudienceHealthStatus.WARNING
    return AudienceHealthStatus.CRITICAL


def calculate_audience_health(health_input: AudienceHealthInput) -> AudienceHealthResult:
    """
    計算受眾健康度

    根據四個因子計算加權平均健康分數

    Args:
        health_input: 健康計算輸入參數

    Returns:
        AudienceHealthResult: 健康計算結果，包含分數、狀態和明細

    Example:
        >>> from datetime import datetime, timedelta
        >>> input = AudienceHealthInput(
        ...     size=50_000,           # 受眾規模 5 萬
        ...     cpa=12.00,             # 受眾 CPA $12
        ...     account_avg_cpa=15.00, # 帳戶平均 CPA $15
        ...     roas=2.5,              # ROAS 2.5x
        ...     days_since_update=15,  # 15 天前更新
        ... )
        >>> result = calculate_audience_health(input)
        >>> result.score
        100
        >>> result.status
        <AudienceHealthStatus.HEALTHY: 'healthy'>
    """
    # 計算新鮮度天數
    if health_input.days_since_update is not None:
        days_since_update = health_input.days_since_update
    elif health_input.last_updated is not None:
        days_since_update = (datetime.now() - health_input.last_updated).days
    else:
        days_since_update = 0  # 假設剛更新

    size_score = calculate_size_score(health_input.size)
    cpa_score = calculate_cpa_score(health_input.cpa, health_input.account_avg_cpa)
    roas_score = calculate_roas_score(health_input.roas)
    freshness_score = calculate_freshness_score(days_since_update)

    score = round(
        size_score * AUDIENCE_HEALTH_WEIGHTS["size"]
        + cpa_score * AUDIENCE_HEALTH_WEIGHTS["cpa"]
        + roas_score * AUDIENCE_HEALTH_WEIGHTS["roas"]
        + freshness_score * AUDIENCE_HEALTH_WEIGHTS["freshness"]
    )

    return AudienceHealthResult(
        score=score,
        status=get_audience_health_status(score),
        breakdown=AudienceHealthBreakdown(
            size_score=size_score,
            cpa_score=cpa_score,
            roas_score=roas_score,
            freshness_score=freshness_score,
        ),
    )
