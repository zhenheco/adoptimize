# -*- coding: utf-8 -*-
"""
健檢報告模型
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount
    from app.models.audit_issue import AuditIssue


class HealthAudit(Base):
    """健檢報告資料表"""

    __tablename__ = "health_audits"

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
    overall_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="總分: 0-100",
    )
    structure_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="帳戶結構分數: 0-100",
    )
    creative_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="素材品質分數: 0-100",
    )
    audience_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="受眾設定分數: 0-100",
    )
    budget_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="預算配置分數: 0-100",
    )
    tracking_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="追蹤設定分數: 0-100",
    )
    issues_count: Mapped[int] = mapped_column(Integer, default=0)
    grade: Mapped[str | None] = mapped_column(
        String(1),
        nullable=True,
        comment="評級: A, B, C, D, F",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # 關聯
    account: Mapped["AdAccount"] = relationship(
        "AdAccount",
        back_populates="health_audits",
    )
    issues: Mapped[list["AuditIssue"]] = relationship(
        "AuditIssue",
        back_populates="audit",
        cascade="all, delete-orphan",
    )
