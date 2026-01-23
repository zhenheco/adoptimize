# -*- coding: utf-8 -*-
"""
報告記錄模型
"""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Report(Base):
    """
    報告記錄表

    儲存每日/週報/月報的內容
    """

    __tablename__ = "reports"

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
    )

    # 報告類型
    report_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="報告類型: daily, weekly, monthly",
    )
    period_start: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="報告期間開始",
    )
    period_end: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="報告期間結束",
    )

    # 報告內容
    content: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment="結構化數據",
    )
    content_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="白話文字版（AI 生成）",
    )

    # 發送狀態
    sent_via: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="發送管道: line, email, web",
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="發送時間",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="建立時間",
    )

    # 關聯
    user: Mapped["User"] = relationship(
        "User",
        back_populates="reports",
    )
