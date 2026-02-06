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
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
        name="ad_account_id",
    )
    external_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    name: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="類型: IMAGE, VIDEO, CAROUSEL, etc.",
    )
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="狀態: ACTIVE, PAUSED, etc.",
    )
    first_served_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=func.now(),
    )

    # 向後相容性別名
    @property
    def account_id(self) -> uuid.UUID:
        """向後相容：使用 ad_account_id"""
        return self.ad_account_id

    @property
    def headline(self) -> str | None:
        """向後相容：使用 name 作為 headline"""
        return self.name

    # 關聯
    account: Mapped["AdAccount"] = relationship("AdAccount", back_populates="creatives")
    metrics: Mapped[list["CreativeMetrics"]] = relationship(
        "CreativeMetrics",
        back_populates="creative",
        cascade="all, delete-orphan",
    )
