# -*- coding: utf-8 -*-
"""
操作歷史模型
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.recommendation import Recommendation
    from app.models.user import User


class ActionHistory(Base):
    """操作歷史資料表"""

    __tablename__ = "action_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    recommendation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendations.id", ondelete="SET NULL"),
        nullable=True,
    )
    action_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="操作類型: PAUSE, ENABLE, BUDGET_CHANGE, etc.",
    )
    target_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="目標類型: CAMPAIGN, ADSET, AD, CREATIVE, AUDIENCE",
    )
    target_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="目標 ID",
    )
    before_state: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="操作前狀態",
    )
    after_state: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="操作後狀態",
    )
    reverted: Mapped[bool] = mapped_column(Boolean, default=False)
    reverted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # 關聯
    user: Mapped["User | None"] = relationship("User")
    recommendation: Mapped["Recommendation | None"] = relationship(
        "Recommendation",
        back_populates="action_history",
    )
