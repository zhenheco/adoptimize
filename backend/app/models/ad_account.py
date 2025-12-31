# -*- coding: utf-8 -*-
"""
廣告帳戶模型
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.creative import Creative
    from app.models.audience import Audience
    from app.models.health_audit import HealthAudit
    from app.models.recommendation import Recommendation
    from app.models.user import User


class AdAccount(Base):
    """廣告帳戶資料表"""

    __tablename__ = "ad_accounts"
    __table_args__ = (
        UniqueConstraint("platform", "external_id", name="uq_platform_external_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="平台: google, meta",
    )
    external_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="平台帳戶 ID",
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        comment="狀態: active, paused, removed",
    )
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # 關聯
    user: Mapped["User"] = relationship("User", back_populates="ad_accounts")
    campaigns: Mapped[list["Campaign"]] = relationship(
        "Campaign",
        back_populates="account",
        cascade="all, delete-orphan",
    )
    creatives: Mapped[list["Creative"]] = relationship(
        "Creative",
        back_populates="account",
        cascade="all, delete-orphan",
    )
    audiences: Mapped[list["Audience"]] = relationship(
        "Audience",
        back_populates="account",
        cascade="all, delete-orphan",
    )
    health_audits: Mapped[list["HealthAudit"]] = relationship(
        "HealthAudit",
        back_populates="account",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="account",
        cascade="all, delete-orphan",
    )
