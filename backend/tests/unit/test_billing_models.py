# -*- coding: utf-8 -*-
"""
計費模型單元測試

測試 Wallet, WalletTransaction, Subscription, BillableAction models
金額使用 TWD 整數，費率使用千分比（如 1000 = 10%）
"""

from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction
from app.models.subscription import Subscription
from app.models.billable_action import BillableAction


class TestWalletModel:
    """Wallet Model 測試"""

    @pytest.mark.asyncio
    async def test_create_wallet(self, db_session: AsyncSession):
        """測試建立錢包"""
        # Arrange
        user = User(
            email="test@example.com",
            name="Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        wallet = Wallet(
            user_id=user.id,
            balance=0,
        )
        db_session.add(wallet)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(Wallet).where(Wallet.user_id == user.id)
        )
        saved_wallet = result.scalar_one()
        assert saved_wallet is not None
        assert saved_wallet.balance == 0
        assert saved_wallet.user_id == user.id

    @pytest.mark.asyncio
    async def test_wallet_user_relationship(self, db_session: AsyncSession):
        """測試錢包與用戶的關聯"""
        # Arrange
        user = User(
            email="test2@example.com",
            name="Test User 2",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=100)
        db_session.add(wallet)
        await db_session.commit()

        # Act & Assert
        result = await db_session.execute(
            select(Wallet).where(Wallet.user_id == user.id)
        )
        saved_wallet = result.scalar_one()
        assert saved_wallet.balance == 100

    @pytest.mark.asyncio
    async def test_wallet_default_balance(self, db_session: AsyncSession):
        """測試錢包預設餘額為 0"""
        # Arrange
        user = User(
            email="test3@example.com",
            name="Test User 3",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act - 不設定 balance，使用預設值
        wallet = Wallet(user_id=user.id)
        db_session.add(wallet)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(Wallet).where(Wallet.user_id == user.id)
        )
        saved_wallet = result.scalar_one()
        assert saved_wallet.balance == 0


class TestWalletTransactionModel:
    """WalletTransaction Model 測試"""

    @pytest.mark.asyncio
    async def test_create_deposit_transaction(self, db_session: AsyncSession):
        """測試建立儲值交易記錄"""
        # Arrange
        user = User(
            email="tx_test@example.com",
            name="TX Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(wallet)
        await db_session.flush()

        # Act
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type="deposit",
            amount=1000,
            balance_after=1000,
            description="首次儲值",
        )
        db_session.add(transaction)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
        )
        saved_tx = result.scalar_one()
        assert saved_tx.type == "deposit"
        assert saved_tx.amount == 1000
        assert saved_tx.balance_after == 1000
        assert saved_tx.description == "首次儲值"

    @pytest.mark.asyncio
    async def test_create_deduction_transaction(self, db_session: AsyncSession):
        """測試建立扣款交易記錄"""
        # Arrange
        user = User(
            email="tx_test2@example.com",
            name="TX Test User 2",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=800)
        db_session.add(wallet)
        await db_session.flush()

        # Act - 負值表示扣款
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type="action_fee",
            amount=-200,
            balance_after=800,
            description="廣告操作抽成",
            reference_id="action_123",
            reference_type="billable_action",
        )
        db_session.add(transaction)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
        )
        saved_tx = result.scalar_one()
        assert saved_tx.type == "action_fee"
        assert saved_tx.amount == -200
        assert saved_tx.reference_id == "action_123"
        assert saved_tx.reference_type == "billable_action"

    @pytest.mark.asyncio
    async def test_transaction_types(self, db_session: AsyncSession):
        """測試各種交易類型"""
        # Arrange
        user = User(
            email="tx_types@example.com",
            name="TX Types User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=5000)
        db_session.add(wallet)
        await db_session.flush()

        # Act - 建立多種類型的交易
        tx_types = [
            "deposit",
            "subscription_fee",
            "action_fee",
            "ai_audience",
            "ai_copywriting",
            "ai_image",
            "refund",
        ]

        for i, tx_type in enumerate(tx_types):
            transaction = WalletTransaction(
                wallet_id=wallet.id,
                type=tx_type,
                amount=100 if tx_type in ["deposit", "refund"] else -100,
                balance_after=5000 - i * 100,
                description=f"測試 {tx_type}",
            )
            db_session.add(transaction)

        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
        )
        transactions = result.scalars().all()
        assert len(transactions) == 7
        saved_types = {tx.type for tx in transactions}
        assert saved_types == set(tx_types)


class TestSubscriptionModel:
    """Subscription Model 測試"""

    @pytest.mark.asyncio
    async def test_create_free_subscription(self, db_session: AsyncSession):
        """測試建立免費方案訂閱"""
        # Arrange
        user = User(
            email="sub_test@example.com",
            name="Sub Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        subscription = Subscription(
            user_id=user.id,
            plan="free",
            monthly_fee=0,
            commission_rate=1000,  # 10% = 1000/10000
        )
        db_session.add(subscription)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        saved_sub = result.scalar_one()
        assert saved_sub.plan == "free"
        assert saved_sub.monthly_fee == 0
        assert saved_sub.commission_rate == 1000
        assert saved_sub.is_active is True

    @pytest.mark.asyncio
    async def test_create_pro_subscription(self, db_session: AsyncSession):
        """測試建立 Pro 方案訂閱"""
        # Arrange
        user = User(
            email="pro_test@example.com",
            name="Pro Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,  # 5% = 500/10000
            monthly_copywriting_quota=50,
            monthly_image_quota=10,
        )
        db_session.add(subscription)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        saved_sub = result.scalar_one()
        assert saved_sub.plan == "pro"
        assert saved_sub.monthly_fee == 1500
        assert saved_sub.commission_rate == 500
        assert saved_sub.monthly_copywriting_quota == 50
        assert saved_sub.monthly_image_quota == 10

    @pytest.mark.asyncio
    async def test_subscription_quota_tracking(self, db_session: AsyncSession):
        """測試訂閱配額追蹤"""
        # Arrange
        user = User(
            email="quota_test@example.com",
            name="Quota Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
            monthly_copywriting_quota=50,
            monthly_image_quota=10,
            monthly_copywriting_used=5,
            monthly_image_used=2,
        )
        db_session.add(subscription)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        saved_sub = result.scalar_one()
        assert saved_sub.monthly_copywriting_used == 5
        assert saved_sub.monthly_image_used == 2
        # 檢查剩餘配額
        assert saved_sub.monthly_copywriting_quota - saved_sub.monthly_copywriting_used == 45
        assert saved_sub.monthly_image_quota - saved_sub.monthly_image_used == 8

    @pytest.mark.asyncio
    async def test_subscription_default_values(self, db_session: AsyncSession):
        """測試訂閱預設值"""
        # Arrange
        user = User(
            email="default_sub@example.com",
            name="Default Sub User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act - 使用最少必要欄位
        subscription = Subscription(user_id=user.id)
        db_session.add(subscription)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        saved_sub = result.scalar_one()
        assert saved_sub.plan == "free"
        assert saved_sub.monthly_fee == 0
        assert saved_sub.commission_rate == 1000  # 預設 10%
        assert saved_sub.is_active is True
        assert saved_sub.monthly_copywriting_used == 0
        assert saved_sub.monthly_image_used == 0


class TestBillableActionModel:
    """BillableAction Model 測試"""

    @pytest.mark.asyncio
    async def test_create_billable_action(self, db_session: AsyncSession):
        """測試建立計費操作記錄"""
        # Arrange
        user = User(
            email="action_test@example.com",
            name="Action Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        action = BillableAction(
            user_id=user.id,
            action_type="CREATE_CAMPAIGN",
            platform="meta",
            ad_spend_amount=10000,
            commission_rate=500,  # 5%
            commission_amount=500,  # 10000 * 5% = 500
        )
        db_session.add(action)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(BillableAction).where(BillableAction.user_id == user.id)
        )
        saved_action = result.scalar_one()
        assert saved_action.action_type == "CREATE_CAMPAIGN"
        assert saved_action.platform == "meta"
        assert saved_action.ad_spend_amount == 10000
        assert saved_action.commission_rate == 500
        assert saved_action.commission_amount == 500
        assert saved_action.is_billed is False

    @pytest.mark.asyncio
    async def test_billable_action_billing_status(self, db_session: AsyncSession):
        """測試計費操作的計費狀態"""
        # Arrange
        user = User(
            email="billing_test@example.com",
            name="Billing Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(wallet)
        await db_session.flush()

        # Act - 建立並標記為已計費
        action = BillableAction(
            user_id=user.id,
            action_type="UPDATE_BUDGET",
            platform="google",
            ad_spend_amount=5000,
            commission_rate=1000,  # 10%
            commission_amount=500,  # 5000 * 10% = 500
            is_billed=True,
            billed_at=datetime.now(timezone.utc),
        )
        db_session.add(action)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(BillableAction).where(BillableAction.user_id == user.id)
        )
        saved_action = result.scalar_one()
        assert saved_action.is_billed is True
        assert saved_action.billed_at is not None

    @pytest.mark.asyncio
    async def test_billable_action_types(self, db_session: AsyncSession):
        """測試各種計費操作類型"""
        # Arrange
        user = User(
            email="action_types@example.com",
            name="Action Types User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        action_types = [
            "CREATE_CAMPAIGN",
            "CREATE_ADSET",
            "CREATE_AD",
            "UPDATE_BUDGET",
            "DUPLICATE_CAMPAIGN",
        ]

        for action_type in action_types:
            action = BillableAction(
                user_id=user.id,
                action_type=action_type,
                platform="meta",
                ad_spend_amount=1000,
                commission_rate=500,
                commission_amount=50,
            )
            db_session.add(action)

        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(BillableAction).where(BillableAction.user_id == user.id)
        )
        actions = result.scalars().all()
        assert len(actions) == 5
        saved_types = {a.action_type for a in actions}
        assert saved_types == set(action_types)

    @pytest.mark.asyncio
    async def test_commission_calculation(self, db_session: AsyncSession):
        """測試抽成計算正確性"""
        # Arrange
        user = User(
            email="calc_test@example.com",
            name="Calc Test User",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act - 測試 10% 抽成 (千分比 1000)
        ad_spend = 10000
        commission_rate = 1000  # 10% = 1000/10000
        # commission = ad_spend * commission_rate / 10000
        expected_commission = ad_spend * commission_rate // 10000

        action = BillableAction(
            user_id=user.id,
            action_type="CREATE_CAMPAIGN",
            platform="meta",
            ad_spend_amount=ad_spend,
            commission_rate=commission_rate,
            commission_amount=expected_commission,
        )
        db_session.add(action)
        await db_session.commit()

        # Assert
        result = await db_session.execute(
            select(BillableAction).where(BillableAction.user_id == user.id)
        )
        saved_action = result.scalar_one()
        assert saved_action.commission_amount == 1000  # 10000 * 10% = 1000
