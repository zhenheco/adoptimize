# -*- coding: utf-8 -*-
"""
訂閱模型

存儲用戶的訂閱方案和 AI 配額使用狀況
"""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Subscription(Base):
    """
    訂閱資料表

    記錄用戶的訂閱方案、費率和 AI 配額使用狀況
    """

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="用戶 ID",
    )
    plan: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="free",
        comment="訂閱方案: free, pro, agency",
    )
    monthly_fee: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="月費 (TWD 整數)",
    )
    commission_rate: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1000,
        comment="抽成費率 (千分比，如 1000 = 10%, 500 = 5%)",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="訂閱開始時間",
    )
    next_billing_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="下次扣款日期",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="是否啟用",
    )

    # AI 配額
    monthly_copywriting_quota: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="每月文案生成配額",
    )
    monthly_image_quota: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="每月圖片生成配額",
    )
    monthly_copywriting_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="本月文案生成已使用次數",
    )
    monthly_image_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="本月圖片生成已使用次數",
    )
    quota_reset_at: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="配額重置日期",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="建立時間",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="更新時間",
    )

    # 關聯
    user: Mapped["User"] = relationship(
        "User",
        back_populates="subscription",
    )

    @property
    def copywriting_remaining(self) -> int:
        """剩餘文案配額"""
        return max(0, self.monthly_copywriting_quota - self.monthly_copywriting_used)

    @property
    def image_remaining(self) -> int:
        """剩餘圖片配額"""
        return max(0, self.monthly_image_quota - self.monthly_image_used)
