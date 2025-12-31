# -*- coding: utf-8 -*-
"""
建議模型
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.action_history import ActionHistory
    from app.models.ad_account import AdAccount
    from app.models.audit_issue import AuditIssue


class Recommendation(Base):
    """建議資料表"""

    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    issue_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("audit_issues.id", ondelete="SET NULL"),
        nullable=True,
    )
    type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="類型: PAUSE_CREATIVE, REDUCE_BUDGET, etc.",
    )
    priority_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="優先級分數",
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_module: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="執行此建議的模組",
    )
    action_params: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="執行參數",
    )
    estimated_impact: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        comment="預估影響金額",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        comment="狀態: pending, executed, ignored",
    )
    executed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # 關聯
    account: Mapped["AdAccount"] = relationship(
        "AdAccount",
        back_populates="recommendations",
    )
    issue: Mapped["AuditIssue | None"] = relationship(
        "AuditIssue",
        back_populates="recommendations",
    )
    action_history: Mapped[list["ActionHistory"]] = relationship(
        "ActionHistory",
        back_populates="recommendation",
        cascade="all, delete-orphan",
    )
