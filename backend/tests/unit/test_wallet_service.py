# -*- coding: utf-8 -*-
"""
錢包服務單元測試

測試 WalletService 的核心功能：
- 建立/取得錢包
- 儲值
- 扣款
- 餘額檢查
- 交易紀錄查詢
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction
from app.services.wallet_service import WalletService


class TestWalletServiceGetOrCreate:
    """測試 get_or_create_wallet"""

    @pytest.mark.asyncio
    async def test_create_wallet_for_new_user(self, db_session: AsyncSession):
        """測試為新用戶建立錢包"""
        # Arrange
        user = User(
            email="new_user@example.com",
            name="New User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        wallet = await WalletService.get_or_create_wallet(db_session, user.id)

        # Assert
        assert wallet is not None
        assert wallet.user_id == user.id
        assert wallet.balance == 0

    @pytest.mark.asyncio
    async def test_get_existing_wallet(self, db_session: AsyncSession):
        """測試取得已存在的錢包"""
        # Arrange
        user = User(
            email="existing@example.com",
            name="Existing User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        existing_wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(existing_wallet)
        await db_session.flush()

        # Act
        wallet = await WalletService.get_or_create_wallet(db_session, user.id)

        # Assert
        assert wallet.id == existing_wallet.id
        assert wallet.balance == 1000


class TestWalletServiceGetBalance:
    """測試 get_balance"""

    @pytest.mark.asyncio
    async def test_get_balance_existing_wallet(self, db_session: AsyncSession):
        """測試取得已存在錢包的餘額"""
        # Arrange
        user = User(
            email="balance_test@example.com",
            name="Balance Test",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=5000)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        balance = await WalletService.get_balance(db_session, user.id)

        # Assert
        assert balance == 5000

    @pytest.mark.asyncio
    async def test_get_balance_no_wallet(self, db_session: AsyncSession):
        """測試取得不存在錢包的餘額（應回傳 0）"""
        # Arrange
        user = User(
            email="no_wallet@example.com",
            name="No Wallet",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        balance = await WalletService.get_balance(db_session, user.id)

        # Assert
        assert balance == 0


class TestWalletServiceDeposit:
    """測試 deposit"""

    @pytest.mark.asyncio
    async def test_deposit_increases_balance(self, db_session: AsyncSession):
        """測試儲值增加餘額"""
        # Arrange
        user = User(
            email="deposit_test@example.com",
            name="Deposit Test",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=0)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        transaction = await WalletService.deposit(
            db_session, user.id, 1000, "測試儲值"
        )

        # Assert
        assert transaction.amount == 1000
        assert transaction.balance_after == 1000
        assert transaction.type == "deposit"

        # 確認錢包餘額已更新
        await db_session.refresh(wallet)
        assert wallet.balance == 1000

    @pytest.mark.asyncio
    async def test_deposit_creates_transaction_record(self, db_session: AsyncSession):
        """測試儲值建立交易記錄"""
        # Arrange
        user = User(
            email="deposit_tx@example.com",
            name="Deposit TX",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=500)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        await WalletService.deposit(db_session, user.id, 2000, "第二次儲值")

        # Assert
        result = await db_session.execute(
            select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
        )
        transactions = result.scalars().all()
        assert len(transactions) == 1
        assert transactions[0].description == "第二次儲值"
        assert transactions[0].balance_after == 2500

    @pytest.mark.asyncio
    async def test_deposit_creates_wallet_if_not_exists(self, db_session: AsyncSession):
        """測試儲值時自動建立錢包"""
        # Arrange
        user = User(
            email="auto_wallet@example.com",
            name="Auto Wallet",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act - 不先建立錢包
        transaction = await WalletService.deposit(
            db_session, user.id, 3000, "首次儲值"
        )

        # Assert
        assert transaction.balance_after == 3000

        # 確認錢包已建立
        result = await db_session.execute(
            select(Wallet).where(Wallet.user_id == user.id)
        )
        wallet = result.scalar_one()
        assert wallet.balance == 3000


class TestWalletServiceDeduct:
    """測試 deduct"""

    @pytest.mark.asyncio
    async def test_deduct_decreases_balance(self, db_session: AsyncSession):
        """測試扣款減少餘額"""
        # Arrange
        user = User(
            email="deduct_test@example.com",
            name="Deduct Test",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=5000)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        transaction = await WalletService.deduct(
            db_session, user.id, 1500, "action_fee", "廣告操作費用"
        )

        # Assert
        assert transaction.amount == -1500
        assert transaction.balance_after == 3500
        assert transaction.type == "action_fee"

        await db_session.refresh(wallet)
        assert wallet.balance == 3500

    @pytest.mark.asyncio
    async def test_deduct_with_reference(self, db_session: AsyncSession):
        """測試扣款時記錄關聯 ID"""
        # Arrange
        user = User(
            email="deduct_ref@example.com",
            name="Deduct Ref",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=10000)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        transaction = await WalletService.deduct(
            db_session,
            user.id,
            200,
            "ai_audience",
            "AI 受眾分析",
            reference_id="ai_job_123",
            reference_type="ai_job",
        )

        # Assert
        assert transaction.reference_id == "ai_job_123"
        assert transaction.reference_type == "ai_job"

    @pytest.mark.asyncio
    async def test_deduct_insufficient_balance_raises_error(self, db_session: AsyncSession):
        """測試餘額不足時拋出錯誤"""
        # Arrange
        user = User(
            email="insufficient@example.com",
            name="Insufficient",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=100)
        db_session.add(wallet)
        await db_session.flush()

        # Act & Assert
        with pytest.raises(ValueError, match="餘額不足"):
            await WalletService.deduct(
                db_session, user.id, 500, "action_fee", "測試扣款"
            )


class TestWalletServiceCheckBalance:
    """測試 check_sufficient_balance"""

    @pytest.mark.asyncio
    async def test_sufficient_balance_returns_true(self, db_session: AsyncSession):
        """測試餘額足夠時回傳 True"""
        # Arrange
        user = User(
            email="sufficient@example.com",
            name="Sufficient",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        result = await WalletService.check_sufficient_balance(db_session, user.id, 500)

        # Assert
        assert result is True

    @pytest.mark.asyncio
    async def test_insufficient_balance_returns_false(self, db_session: AsyncSession):
        """測試餘額不足時回傳 False"""
        # Arrange
        user = User(
            email="not_enough@example.com",
            name="Not Enough",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=100)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        result = await WalletService.check_sufficient_balance(db_session, user.id, 500)

        # Assert
        assert result is False

    @pytest.mark.asyncio
    async def test_exact_balance_returns_true(self, db_session: AsyncSession):
        """測試餘額剛好足夠時回傳 True"""
        # Arrange
        user = User(
            email="exact@example.com",
            name="Exact",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=500)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        result = await WalletService.check_sufficient_balance(db_session, user.id, 500)

        # Assert
        assert result is True


class TestWalletServiceTransactionHistory:
    """測試 get_transaction_history"""

    @pytest.mark.asyncio
    async def test_get_transaction_history(self, db_session: AsyncSession):
        """測試取得交易紀錄"""
        # Arrange
        user = User(
            email="history@example.com",
            name="History",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=0)
        db_session.add(wallet)
        await db_session.flush()

        # 建立多筆交易
        await WalletService.deposit(db_session, user.id, 1000, "儲值 1")
        await WalletService.deposit(db_session, user.id, 500, "儲值 2")
        await WalletService.deduct(db_session, user.id, 200, "action_fee", "扣款 1")

        # Act
        transactions = await WalletService.get_transaction_history(db_session, user.id)

        # Assert
        assert len(transactions) == 3

    @pytest.mark.asyncio
    async def test_get_transaction_history_with_limit(self, db_session: AsyncSession):
        """測試取得交易紀錄時限制數量"""
        # Arrange
        user = User(
            email="history_limit@example.com",
            name="History Limit",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=0)
        db_session.add(wallet)
        await db_session.flush()

        # 建立多筆交易
        for i in range(10):
            await WalletService.deposit(db_session, user.id, 100, f"儲值 {i+1}")

        # Act
        transactions = await WalletService.get_transaction_history(
            db_session, user.id, limit=5
        )

        # Assert
        assert len(transactions) == 5

    @pytest.mark.asyncio
    async def test_transaction_history_records_all_types(self, db_session: AsyncSession):
        """測試交易紀錄正確記錄所有類型"""
        # Arrange
        user = User(
            email="all_types@example.com",
            name="All Types",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=10000)
        db_session.add(wallet)
        await db_session.flush()

        # Act - 建立各種類型的交易
        await WalletService.deduct(db_session, user.id, 200, "ai_audience", "AI 受眾")
        await WalletService.deduct(db_session, user.id, 5, "ai_copywriting", "AI 文案")
        await WalletService.deduct(db_session, user.id, 10, "ai_image", "AI 圖片")
        await WalletService.deduct(db_session, user.id, 100, "action_fee", "操作費")
        await WalletService.deduct(db_session, user.id, 1500, "subscription_fee", "月費")

        transactions = await WalletService.get_transaction_history(db_session, user.id)

        # Assert
        tx_types = {tx.type for tx in transactions}
        expected_types = {"ai_audience", "ai_copywriting", "ai_image", "action_fee", "subscription_fee"}
        assert tx_types == expected_types

    @pytest.mark.asyncio
    async def test_balance_after_is_accurate(self, db_session: AsyncSession):
        """測試 balance_after 欄位準確"""
        # Arrange
        user = User(
            email="accurate@example.com",
            name="Accurate",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=0)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        tx1 = await WalletService.deposit(db_session, user.id, 1000, "儲值")
        tx2 = await WalletService.deduct(db_session, user.id, 300, "action_fee", "扣款")
        tx3 = await WalletService.deposit(db_session, user.id, 500, "再儲值")

        # Assert
        assert tx1.balance_after == 1000
        assert tx2.balance_after == 700
        assert tx3.balance_after == 1200

        await db_session.refresh(wallet)
        assert wallet.balance == 1200
