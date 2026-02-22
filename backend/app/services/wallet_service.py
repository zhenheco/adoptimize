# -*- coding: utf-8 -*-
"""
錢包服務

處理錢包相關業務邏輯：
- 建立/取得錢包
- 儲值
- 扣款
- 餘額檢查
- 交易紀錄查詢
"""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wallet import Wallet, WalletTransaction


class WalletService:
    """錢包服務類別（靜態方法）"""

    @staticmethod
    async def get_or_create_wallet(db: AsyncSession, user_id: uuid.UUID) -> Wallet:
        """
        取得或建立用戶錢包

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            Wallet: 錢包物件
        """
        # 嘗試取得現有錢包
        result = await db.execute(
            select(Wallet).where(Wallet.user_id == user_id)
        )
        wallet = result.scalar_one_or_none()

        if wallet is None:
            # 建立新錢包
            wallet = Wallet(user_id=user_id, balance=0)
            db.add(wallet)
            await db.flush()

        return wallet

    @staticmethod
    async def get_balance(db: AsyncSession, user_id: uuid.UUID) -> int:
        """
        取得用戶餘額

        Args:
            db: 資料庫 session
            user_id: 用戶 ID

        Returns:
            int: 餘額（TWD 整數），若無錢包則回傳 0
        """
        result = await db.execute(
            select(Wallet.balance).where(Wallet.user_id == user_id)
        )
        balance = result.scalar_one_or_none()
        return balance if balance is not None else 0

    @staticmethod
    async def deposit(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        description: str,
    ) -> WalletTransaction:
        """
        儲值到錢包

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            amount: 儲值金額（正整數）
            description: 交易描述

        Returns:
            WalletTransaction: 交易記錄
        """
        if amount <= 0:
            raise ValueError("儲值金額必須為正數")

        # 取得或建立錢包
        wallet = await WalletService.get_or_create_wallet(db, user_id)

        # 更新餘額
        wallet.balance += amount
        new_balance = wallet.balance

        # 建立交易記錄
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type="deposit",
            amount=amount,
            balance_after=new_balance,
            description=description,
        )
        db.add(transaction)
        await db.flush()

        return transaction

    @staticmethod
    async def deduct(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        tx_type: str,
        description: str,
        reference_id: Optional[str] = None,
        reference_type: Optional[str] = None,
    ) -> WalletTransaction:
        """
        從錢包扣款

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            amount: 扣款金額（正整數）
            tx_type: 交易類型（action_fee, ai_audience, ai_copywriting, ai_image, subscription_fee）
            description: 交易描述
            reference_id: 關聯 ID（可選）
            reference_type: 關聯類型（可選）

        Returns:
            WalletTransaction: 交易記錄

        Raises:
            ValueError: 餘額不足時拋出
        """
        if amount <= 0:
            raise ValueError("扣款金額必須為正數")

        # 使用 FOR UPDATE 鎖定錢包，防止並發扣款競態條件
        result = await db.execute(
            select(Wallet).where(Wallet.user_id == user_id).with_for_update()
        )
        wallet = result.scalar_one_or_none()

        if wallet is None:
            raise ValueError("用戶沒有錢包，無法扣款")

        # 檢查餘額
        if wallet.balance < amount:
            raise ValueError(f"餘額不足：目前餘額 {wallet.balance}，需要 {amount}")

        # 更新餘額
        wallet.balance -= amount
        new_balance = wallet.balance

        # 建立交易記錄（金額為負值）
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type=tx_type,
            amount=-amount,
            balance_after=new_balance,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type,
        )
        db.add(transaction)
        await db.flush()

        return transaction

    @staticmethod
    async def check_sufficient_balance(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
    ) -> bool:
        """
        檢查餘額是否足夠

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            amount: 需要的金額

        Returns:
            bool: 是否足夠
        """
        balance = await WalletService.get_balance(db, user_id)
        return balance >= amount

    @staticmethod
    async def get_transaction_history(
        db: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 50,
    ) -> list[WalletTransaction]:
        """
        取得交易紀錄

        Args:
            db: 資料庫 session
            user_id: 用戶 ID
            limit: 最大筆數（預設 50）

        Returns:
            list[WalletTransaction]: 交易記錄列表（按時間倒序）
        """
        # 先取得錢包
        result = await db.execute(
            select(Wallet).where(Wallet.user_id == user_id)
        )
        wallet = result.scalar_one_or_none()

        if wallet is None:
            return []

        # 取得交易記錄
        result = await db.execute(
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
            .order_by(WalletTransaction.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
