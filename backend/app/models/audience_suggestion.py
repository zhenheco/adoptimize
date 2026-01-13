# -*- coding: utf-8 -*-
"""
受眾建議模型

儲存 AI 生成的受眾組合建議記錄，
追蹤建議的執行狀態和結果。
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount
    from app.models.user import User


class AudienceSuggestion(Base):
    """
    受眾建議資料表

    儲存 AI 根據客戶數據和產業基準生成的受眾組合建議，
    包含推薦的興趣標籤、預估成效、執行狀態等。
    """

    __tablename__ = "audience_suggestions"

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
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 輸入參數
    industry_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="選擇的產業代碼",
    )
    objective_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="選擇的廣告目標",
    )
    additional_context: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="用戶提供的補充說明",
    )

    # AI 生成的建議
    suggested_interests: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        comment="推薦的興趣標籤清單，含 ID、名稱、相關性分數",
    )
    reasoning: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="AI 推薦理由說明",
    )
    budget_allocation: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="預算分配建議",
    )
    creative_recommendations: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="素材推薦",
    )
    suggested_ad_copy: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="AI 生成的廣告文案建議",
    )

    # 預估成效
    estimated_reach_lower: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="預估觸及人數下限",
    )
    estimated_reach_upper: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="預估觸及人數上限",
    )
    estimated_cpa: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        comment="預估 CPA",
    )
    estimated_roas: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4),
        nullable=True,
        comment="預估 ROAS",
    )
    confidence_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
        comment="AI 信心分數 (0-1)",
    )

    # 執行狀態追蹤
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="generated",
        index=True,
        comment="狀態: generated, saved, executed, expired",
    )
    meta_audience_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Meta 中建立的受眾 ID",
    )
    meta_adset_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Meta 中建立的廣告組合 ID",
    )
    meta_ad_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Meta 中建立的廣告 ID",
    )

    # 元數據
    ai_model_version: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="使用的 AI 模型版本",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    executed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="執行時間",
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="建議過期時間",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # 關聯
    user: Mapped["User"] = relationship("User", back_populates="audience_suggestions")
    account: Mapped["AdAccount"] = relationship(
        "AdAccount", back_populates="audience_suggestions"
    )

    __table_args__ = ({"comment": "AI 受眾建議記錄表"},)
