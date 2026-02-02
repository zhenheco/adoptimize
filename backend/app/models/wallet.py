# -*- coding: utf-8 -*-
"""
錢包模型

存儲用戶的預付餘額和交易紀錄
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Wallet(Base):
    """
    錢包資料表

    每個用戶有一個錢包，存儲預付餘額
    """

    __tablename__ = "wallets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="用戶 ID",
    )
    balance: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="餘額 (TWD，整數)",
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
    user: Mapped["User"] = relationship(
        "User",
        back_populates="wallet",
    )
    transactions: Mapped[list["WalletTransaction"]] = relationship(
        "WalletTransaction",
        back_populates="wallet",
        cascade="all, delete-orphan",
        order_by="desc(WalletTransaction.created_at)",
    )


class WalletTransaction(Base):
    """
    錢包交易紀錄

    記錄所有進出帳，包括儲值、月費、操作抽成、AI 費用等
    """

    __tablename__ = "wallet_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="錢包 ID",
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="交易類型: deposit, subscription_fee, action_fee, ai_audience, ai_copywriting, ai_image, refund",
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="金額 (正值=入帳，負值=扣款，TWD 整數)",
    )
    balance_after: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="交易後餘額 (TWD 整數)",
    )
    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="交易描述",
    )
    reference_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="關聯 ID (如 BillableAction ID)",
    )
    reference_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="關聯類型 (如 billable_action, subscription)",
    )
    extra_data: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="額外資訊",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        comment="建立時間",
    )

    # 關聯
    wallet: Mapped["Wallet"] = relationship(
        "Wallet",
        back_populates="transactions",
    )
