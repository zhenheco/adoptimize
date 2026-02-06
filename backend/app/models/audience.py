# -*- coding: utf-8 -*-
"""
受眾模型
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount
    from app.models.audience_metrics import AudienceMetrics


class Audience(Base):
    """受眾資料表"""

    __tablename__ = "audiences"

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
    type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="類型: CUSTOM, LOOKALIKE, SAVED, etc.",
    )
    size: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        comment="受眾規模",
    )
    status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="狀態: active, archived",
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
    account: Mapped["AdAccount"] = relationship("AdAccount", back_populates="audiences")
    metrics: Mapped[list["AudienceMetrics"]] = relationship(
        "AudienceMetrics",
        back_populates="audience",
        cascade="all, delete-orphan",
    )
