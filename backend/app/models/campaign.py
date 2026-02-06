# -*- coding: utf-8 -*-
"""
廣告活動模型
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount
    from app.models.ad_set import AdSet


class Campaign(Base):
    """廣告活動資料表"""

    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    external_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    objective: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="目標: CONVERSIONS, TRAFFIC, AWARENESS, etc.",
    )
    status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="狀態: ENABLED, PAUSED, REMOVED",
    )
    budget_daily: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        comment="每日預算",
    )
    budget_lifetime: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        comment="總預算",
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # 關聯
    account: Mapped["AdAccount"] = relationship("AdAccount", back_populates="campaigns")
    ad_sets: Mapped[list["AdSet"]] = relationship(
        "AdSet",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )
