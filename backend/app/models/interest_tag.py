# -*- coding: utf-8 -*-
"""
Meta 興趣標籤模型

儲存 Meta Marketing API 的興趣標籤主檔，
用於 AI 建議引擎推薦受眾組合。
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InterestTag(Base):
    """
    Meta 興趣標籤資料表

    儲存從 Meta API targeting_search 獲取的興趣標籤，
    包含產業相關性和目標相關性評分，供 AI 推薦使用。
    """

    __tablename__ = "interest_tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    meta_interest_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Meta API 興趣 ID",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="興趣名稱（英文）",
    )
    name_zh: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="興趣名稱（繁體中文）",
    )
    path: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="興趣分類路徑，如 Interests > Shopping",
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="興趣分類",
    )
    audience_size_lower: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="受眾規模下限",
    )
    audience_size_upper: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        comment="受眾規模上限",
    )
    industry_relevance: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict,
        comment='產業相關性分數，如 {"ECOMMERCE": 0.9, "EDUCATION": 0.3}',
    )
    objective_relevance: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict,
        comment='目標相關性分數，如 {"AWARENESS": 0.8, "CONVERSION": 0.6}',
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        comment="興趣描述",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="是否啟用",
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最後從 Meta API 同步時間",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = ({"comment": "Meta 興趣標籤主檔"},)
