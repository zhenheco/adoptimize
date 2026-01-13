# -*- coding: utf-8 -*-
"""
同步頻率排程器

根據用戶訂閱層級控制廣告數據同步頻率。

訂閱層級與同步頻率對照（依 SDD 規格）：
- STARTER: 每 12 小時（720 分鐘）
- PROFESSIONAL: 每 15 分鐘
- AGENCY: 每 15 分鐘
- ENTERPRISE: 每 5 分鐘（近即時）
"""

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class SubscriptionTier(str, Enum):
    """訂閱層級"""

    STARTER = "STARTER"
    PROFESSIONAL = "PROFESSIONAL"
    AGENCY = "AGENCY"
    ENTERPRISE = "ENTERPRISE"


# 同步間隔設定（分鐘）
SYNC_INTERVALS: dict[SubscriptionTier, int] = {
    SubscriptionTier.STARTER: 720,  # 12 小時
    SubscriptionTier.PROFESSIONAL: 15,
    SubscriptionTier.AGENCY: 15,
    SubscriptionTier.ENTERPRISE: 5,
}


class SyncScheduleInput(BaseModel):
    """同步排程輸入"""

    subscription_tier: SubscriptionTier
    last_sync_at: Optional[datetime] = None


class SyncScheduleResult(BaseModel):
    """同步排程結果"""

    should_sync: bool
    next_sync_at: datetime
    interval_minutes: int
    reason: str


def get_sync_interval(tier: SubscriptionTier) -> int:
    """
    取得指定訂閱層級的同步間隔（分鐘）

    Args:
        tier: 訂閱層級

    Returns:
        同步間隔（分鐘）
    """
    return SYNC_INTERVALS.get(tier, SYNC_INTERVALS[SubscriptionTier.STARTER])


def calculate_next_sync_time(
    tier: SubscriptionTier,
    last_sync_at: Optional[datetime] = None,
) -> datetime:
    """
    計算下次同步時間

    Args:
        tier: 訂閱層級
        last_sync_at: 上次同步時間（None 表示從未同步）

    Returns:
        下次同步時間
    """
    interval = get_sync_interval(tier)
    now = datetime.now(timezone.utc)

    if last_sync_at is None:
        # 從未同步，立即同步
        return now

    # 計算下次同步時間
    next_sync = last_sync_at + timedelta(minutes=interval)

    # 如果已經過了下次同步時間，返回現在
    if next_sync <= now:
        return now

    return next_sync


def should_sync_now(
    tier: SubscriptionTier,
    last_sync_at: Optional[datetime] = None,
) -> SyncScheduleResult:
    """
    判斷是否應該現在同步

    Args:
        tier: 訂閱層級
        last_sync_at: 上次同步時間

    Returns:
        SyncScheduleResult: 包含是否應同步及相關資訊
    """
    interval = get_sync_interval(tier)
    now = datetime.now(timezone.utc)
    next_sync = calculate_next_sync_time(tier, last_sync_at)

    if last_sync_at is None:
        return SyncScheduleResult(
            should_sync=True,
            next_sync_at=now,
            interval_minutes=interval,
            reason="從未同步，需要初始同步",
        )

    if next_sync <= now:
        return SyncScheduleResult(
            should_sync=True,
            next_sync_at=now,
            interval_minutes=interval,
            reason=f"距離上次同步已超過 {interval} 分鐘",
        )

    return SyncScheduleResult(
        should_sync=False,
        next_sync_at=next_sync,
        interval_minutes=interval,
        reason=f"下次同步時間為 {next_sync.isoformat()}",
    )


def get_accounts_due_for_sync(
    accounts: list[dict],
) -> list[dict]:
    """
    從帳戶列表中篩選出需要同步的帳戶

    Args:
        accounts: 帳戶列表，每個帳戶應包含：
            - id: 帳戶 ID
            - subscription_tier: 訂閱層級
            - last_sync_at: 上次同步時間（可為 None）

    Returns:
        需要同步的帳戶列表
    """
    due_accounts = []

    for account in accounts:
        tier_str = account.get("subscription_tier", "STARTER")
        try:
            tier = SubscriptionTier(tier_str)
        except ValueError:
            tier = SubscriptionTier.STARTER

        last_sync = account.get("last_sync_at")
        if isinstance(last_sync, str):
            last_sync = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))

        result = should_sync_now(tier, last_sync)
        if result.should_sync:
            due_accounts.append({
                **account,
                "sync_reason": result.reason,
            })

    return due_accounts


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
