# -*- coding: utf-8 -*-
"""
計費操作模型

記錄需要計費的廣告操作
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.wallet import WalletTransaction


class BillableAction(Base):
    """
    計費操作資料表

    記錄需要計算抽成的廣告操作
    """

    __tablename__ = "billable_actions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用戶 ID",
    )
    action_history_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("action_history.id", ondelete="SET NULL"),
        nullable=True,
        comment="操作歷史記錄 ID",
    )
    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="操作類型: CREATE_CAMPAIGN, CREATE_ADSET, CREATE_AD, UPDATE_BUDGET, DUPLICATE_CAMPAIGN",
    )
    platform: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="廣告平台: google, meta, tiktok, linkedin, reddit, line",
    )
    ad_spend_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="廣告花費金額 (TWD 整數)",
    )
    commission_rate: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="抽成費率 (千分比，如 1000 = 10%)",
    )
    commission_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="抽成金額 (TWD 整數)",
    )
    is_billed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="是否已計費",
    )
    billed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="計費時間",
    )
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="關聯的錢包交易 ID",
    )
    extra_data: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="額外資訊",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        comment="建立時間",
    )

    # 關聯
    user: Mapped["User"] = relationship(
        "User",
        back_populates="billable_actions",
    )
