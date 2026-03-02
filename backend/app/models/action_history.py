# -*- coding: utf-8 -*-
"""
操作歷史模型

注意：Python 屬性名與 DB 欄位名存在映射關係：
- before_state → DB: old_value
- after_state → DB: new_value
- reverted → 衍生自 DB: status == 'rolled_back'
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount
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
    recommendation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="操作類型: PAUSE, ENABLE, BUDGET_CHANGE, etc.",
    )
    target_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="目標類型: CAMPAIGN, ADSET, AD, CREATIVE, AUDIENCE",
    )
    target_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="目標 ID",
    )
    target_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="目標名稱",
    )
    # Python attr: before_state → DB column: old_value
    before_state: Mapped[dict[str, Any] | None] = mapped_column(
        "old_value",
        JSONB,
        nullable=True,
        comment="操作前狀態",
    )
    # Python attr: after_state → DB column: new_value
    after_state: Mapped[dict[str, Any] | None] = mapped_column(
        "new_value",
        JSONB,
        nullable=True,
        comment="操作後狀態",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="completed",
        comment="狀態: completed, failed, rolled_back",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    rolled_back_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    @property
    def reverted(self) -> bool:
        """向後相容：根據 status 判斷是否已回滾"""
        return self.status == "rolled_back"

    @property
    def reverted_at(self) -> datetime | None:
        """向後相容：使用 rolled_back_at"""
        return self.rolled_back_at

    # 關聯
    account: Mapped["AdAccount"] = relationship("AdAccount")
    user: Mapped["User | None"] = relationship("User")
    recommendation: Mapped["Recommendation | None"] = relationship(
        "Recommendation",
        back_populates="action_history",
    )
