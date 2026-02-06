# -*- coding: utf-8 -*-
"""
廣告組模型
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad import Ad
    from app.models.campaign import Campaign


class AdSet(Base):
    """廣告組資料表"""

    __tablename__ = "ad_sets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    external_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    targeting: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="受眾設定 JSON",
    )
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    budget_daily: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        comment="每日預算",
    )
    bid_strategy: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="出價策略",
    )
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
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="ad_sets")
    ads: Mapped[list["Ad"]] = relationship(
        "Ad",
        back_populates="ad_set",
        cascade="all, delete-orphan",
    )
