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
    from app.models.billable_action import BillableAction
    from app.models.notification import Notification
    from app.models.report import Report
    from app.models.subscription import Subscription
    from app.models.wallet import Wallet


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
    action_count_reset_at: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="一鍵執行次數重置日期",
    )
    # 移除 monthly_suggestion_count 和 suggestion_count_reset_at
    # 這些欄位資料庫中不存在，改用 property 提供預設值
    @property
    def monthly_suggestion_count(self) -> int:
        return 0

    @property
    def suggestion_count_reset_at(self) -> date:
        return date.today()

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="是否啟用",
    )
    oauth_provider: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="OAuth 提供者 (google, meta)",
    )
    oauth_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="OAuth 提供者的用戶 ID",
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
    reports: Mapped[list["Report"]] = relationship(
        "Report",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    wallet: Mapped[Optional["Wallet"]] = relationship(
        "Wallet",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    subscription: Mapped[Optional["Subscription"]] = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    billable_actions: Mapped[list["BillableAction"]] = relationship(
        "BillableAction",
        back_populates="user",
        cascade="all, delete-orphan",
    )
