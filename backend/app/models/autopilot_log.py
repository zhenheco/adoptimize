# -*- coding: utf-8 -*-
"""
自動駕駛執行記錄模型
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount


class AutopilotLog(Base):
    """
    自動駕駛執行記錄表

    記錄 AI 自動執行的動作，包含暫停廣告、調整預算等
    """

    __tablename__ = "autopilot_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 動作資訊
    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="動作類型: pause_ad, adjust_budget, pause_creative, boost_budget",
    )
    target_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="目標類型: campaign, ad_set, ad, creative",
    )
    target_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="外部平台的 ID",
    )
    target_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="廣告名稱（方便顯示）",
    )

    # 執行細節
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="白話原因：成本超標 20%",
    )
    before_state: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="執行前狀態",
    )
    after_state: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="執行後狀態",
    )
    estimated_savings: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        comment="預估節省金額",
    )

    # 狀態
    status: Mapped[str] = mapped_column(
        String(20),
        default="executed",
        comment="狀態: executed, pending, failed",
    )
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        comment="執行時間",
    )

    # 關聯
    account: Mapped["AdAccount"] = relationship(
        "AdAccount",
        back_populates="autopilot_logs",
    )
