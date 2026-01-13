# -*- coding: utf-8 -*-
"""
用戶模型

根據 SDD v1.0 規格設計
"""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount
    from app.models.audience_suggestion import AudienceSuggestion
    from app.models.notification import Notification


class User(Base):
    """
    用戶資料表

    對應 SDD 2.2.1 users 表規格
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="登入信箱",
    )
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="密碼雜湊 (bcrypt)",
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="姓名",
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="公司名稱",
    )
    subscription_tier: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="STARTER",
        comment="訂閱層級: STARTER, PROFESSIONAL, AGENCY, ENTERPRISE",
    )
    monthly_action_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="本月一鍵執行次數",
    )
    action_count_reset_at: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=date.today,
        comment="一鍵執行次數重置日期",
    )
    monthly_suggestion_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="本月智慧建議生成次數",
    )
    suggestion_count_reset_at: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=date.today,
        comment="建議次數重置日期",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="是否啟用",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="建立時間",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="更新時間",
    )

    # 關聯
    ad_accounts: Mapped[list["AdAccount"]] = relationship(
        "AdAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audience_suggestions: Mapped[list["AudienceSuggestion"]] = relationship(
        "AudienceSuggestion",
        back_populates="user",
        cascade="all, delete-orphan",
    )
