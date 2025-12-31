# -*- coding: utf-8 -*-
"""
健檢問題模型
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.health_audit import HealthAudit
    from app.models.recommendation import Recommendation


class AuditIssue(Base):
    """問題清單資料表"""

    __tablename__ = "audit_issues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("health_audits.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="類別: STRUCTURE, CREATIVE, AUDIENCE, BUDGET, TRACKING",
    )
    severity: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="嚴重度: CRITICAL, HIGH, MEDIUM, LOW",
    )
    issue_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="問題代碼，如 CREATIVE_FATIGUE",
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    impact_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="對廣告效果的影響",
    )
    solution: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="建議解決方案",
    )
    affected_entities: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="受影響的實體 ID 列表",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="open",
        comment="狀態: open, resolved, ignored",
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # 關聯
    audit: Mapped["HealthAudit"] = relationship("HealthAudit", back_populates="issues")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="issue",
        cascade="all, delete-orphan",
    )
