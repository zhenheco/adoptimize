# -*- coding: utf-8 -*-
"""
素材模型
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad import Ad
    from app.models.ad_account import AdAccount
    from app.models.creative_metrics import CreativeMetrics


class Creative(Base):
    """素材資料表"""

    __tablename__ = "creatives"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    external_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="類型: IMAGE, VIDEO, CAROUSEL, etc.",
    )
    headline: Mapped[str | None] = mapped_column(String(500), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cta: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="CTA: LEARN_MORE, SHOP_NOW, etc.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # 關聯
    account: Mapped["AdAccount"] = relationship("AdAccount", back_populates="creatives")
    ads: Mapped[list["Ad"]] = relationship("Ad", back_populates="creative")
    metrics: Mapped[list["CreativeMetrics"]] = relationship(
        "CreativeMetrics",
        back_populates="creative",
        cascade="all, delete-orphan",
    )
