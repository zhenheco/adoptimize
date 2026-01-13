# -*- coding: utf-8 -*-
"""
產業基準模型

儲存各產業在不同廣告目標下的效能基準數據，
用於 AI 建議引擎作為參考依據。
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IndustryBenchmark(Base):
    """
    產業基準資料表

    儲存各產業在不同廣告目標下的平均效能指標，
    資料來源可為市場研究或平台匯總數據。
    """

    __tablename__ = "industry_benchmarks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    industry_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="產業代碼: ECOMMERCE, SERVICES, EDUCATION, FINANCE, FOOD, TRAVEL, REALESTATE, OTHER",
    )
    industry_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="產業名稱（中文）",
    )
    objective_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="廣告目標: AWARENESS, CONSIDERATION, CONVERSION, RETENTION",
    )
    objective_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="目標名稱（中文）",
    )
    avg_cpa: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        comment="平均 CPA (TWD)",
    )
    avg_roas: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4),
        nullable=True,
        comment="平均 ROAS",
    )
    avg_ctr: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 6),
        nullable=True,
        comment="平均點擊率",
    )
    avg_cpc: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        comment="平均 CPC (TWD)",
    )
    avg_cpm: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2),
        nullable=True,
        comment="平均 CPM (TWD)",
    )
    sample_size: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="樣本數量（帳戶數）",
    )
    data_period: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="數據期間，如 2025-Q4",
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

    __table_args__ = (
        # 產業 + 目標的唯一約束
        {"comment": "產業基準數據表"},
    )
