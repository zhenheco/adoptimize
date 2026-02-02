# -*- coding: utf-8 -*-
"""
計費服務單元測試

測試 BillingService 的核心功能：
- 訂閱管理
- 月費扣款
- 操作抽成
- AI 計費
- 方案升級
"""

from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.wallet import Wallet
from app.models.subscription import Subscription
from app.models.billable_action import BillableAction
from app.services.billing_config import PRICING_PLANS, BILLABLE_ACTIONS
from app.services.billing_service import BillingService


class TestBillingConfig:
    """測試計費配置"""

    def test_pricing_plans_exist(self):
        """測試定價方案存在"""
        assert "free" in PRICING_PLANS
        assert "pro" in PRICING_PLANS
        assert "agency" in PRICING_PLANS

    def test_free_plan_config(self):
        """測試免費方案配置"""
        free = PRICING_PLANS["free"]
        assert free["monthly_fee"] == 0
        assert free["commission_rate"] == 1000  # 10%
        assert free["monthly_copywriting_quota"] == 0
        assert free["monthly_image_quota"] == 0

    def test_pro_plan_config(self):
        """測試 Pro 方案配置"""
        pro = PRICING_PLANS["pro"]
        assert pro["monthly_fee"] == 1500
        assert pro["commission_rate"] == 500  # 5%
        assert pro["monthly_copywriting_quota"] == 50
        assert pro["monthly_image_quota"] == 10

    def test_agency_plan_config(self):
        """測試 Agency 方案配置"""
        agency = PRICING_PLANS["agency"]
        assert agency["monthly_fee"] == 7500
        assert agency["commission_rate"] == 300  # 3%
        assert agency["monthly_copywriting_quota"] == -1  # 無限
        assert agency["monthly_image_quota"] == 50

    def test_billable_actions_config(self):
        """測試計費操作配置"""
        assert BILLABLE_ACTIONS["CREATE_CAMPAIGN"] is True
        assert BILLABLE_ACTIONS["CREATE_ADSET"] is True
        assert BILLABLE_ACTIONS["UPDATE_BUDGET"] is True
        assert BILLABLE_ACTIONS["PAUSE"] is False
        assert BILLABLE_ACTIONS["ENABLE"] is False


class TestBillingServiceSubscription:
    """測試訂閱相關功能"""

    @pytest.mark.asyncio
    async def test_get_or_create_subscription(self, db_session: AsyncSession):
        """測試取得或建立訂閱"""
        # Arrange
        user = User(
            email="sub_test@example.com",
            name="Sub Test",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)

        # Assert
        assert subscription is not None
        assert subscription.plan == "free"
        assert subscription.commission_rate == 1000

    @pytest.mark.asyncio
    async def test_skip_fee_for_free_plan(self, db_session: AsyncSession):
        """測試免費方案不扣月費"""
        # Arrange
        user = User(
            email="free_plan@example.com",
            name="Free Plan",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=10000)
        db_session.add(wallet)

        subscription = Subscription(user_id=user.id, plan="free", monthly_fee=0, commission_rate=1000)
        db_session.add(subscription)
        await db_session.flush()

        # Act
        result = await BillingService.charge_subscription_fee(db_session, user.id)

        # Assert
        assert result is True
        await db_session.refresh(wallet)
        assert wallet.balance == 10000  # 餘額不變


class TestBillingServiceMonthlyFee:
    """測試月費扣款"""

    @pytest.mark.asyncio
    async def test_monthly_fee_deduction(self, db_session: AsyncSession):
        """測試月費扣款成功"""
        # Arrange
        user = User(
            email="monthly_fee@example.com",
            name="Monthly Fee",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=5000)
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        result = await BillingService.charge_subscription_fee(db_session, user.id)

        # Assert
        assert result is True
        await db_session.refresh(wallet)
        assert wallet.balance == 3500  # 5000 - 1500

    @pytest.mark.asyncio
    async def test_insufficient_balance_blocks_fee_deduction(self, db_session: AsyncSession):
        """測試餘額不足時阻擋月費扣款"""
        # Arrange
        user = User(
            email="insufficient_fee@example.com",
            name="Insufficient Fee",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=500)  # 餘額不足
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        result = await BillingService.charge_subscription_fee(db_session, user.id)

        # Assert
        assert result is False
        await db_session.refresh(wallet)
        assert wallet.balance == 500  # 餘額不變


class TestBillingServiceCommission:
    """測試操作抽成"""

    @pytest.mark.asyncio
    async def test_commission_calculation_for_free_tier(self, db_session: AsyncSession):
        """測試免費方案 10% 抽成"""
        # Arrange
        user = User(
            email="free_comm@example.com",
            name="Free Comm",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=10000)
        db_session.add(wallet)

        subscription = Subscription(user_id=user.id, plan="free", monthly_fee=0, commission_rate=1000)
        db_session.add(subscription)
        await db_session.flush()

        # Act
        action = await BillingService.charge_action_commission(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 10000
        )

        # Assert
        assert action.commission_rate == 1000
        assert action.commission_amount == 1000  # 10000 * 10% = 1000
        await db_session.refresh(wallet)
        assert wallet.balance == 9000  # 10000 - 1000

    @pytest.mark.asyncio
    async def test_commission_calculation_for_pro_tier(self, db_session: AsyncSession):
        """測試 Pro 方案 5% 抽成"""
        # Arrange
        user = User(
            email="pro_comm@example.com",
            name="Pro Comm",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=10000)
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        action = await BillingService.charge_action_commission(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 10000
        )

        # Assert
        assert action.commission_rate == 500
        assert action.commission_amount == 500  # 10000 * 5% = 500
        await db_session.refresh(wallet)
        assert wallet.balance == 9500

    @pytest.mark.asyncio
    async def test_commission_calculation_for_agency_tier(self, db_session: AsyncSession):
        """測試 Agency 方案 3% 抽成"""
        # Arrange
        user = User(
            email="agency_comm@example.com",
            name="Agency Comm",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=10000)
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="agency",
            monthly_fee=7500,
            commission_rate=300,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        action = await BillingService.charge_action_commission(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 10000
        )

        # Assert
        assert action.commission_rate == 300
        assert action.commission_amount == 300  # 10000 * 3% = 300
        await db_session.refresh(wallet)
        assert wallet.balance == 9700

    @pytest.mark.asyncio
    async def test_non_billable_action_no_charge(self, db_session: AsyncSession):
        """測試非計費操作不收費"""
        # Arrange
        user = User(
            email="non_billable@example.com",
            name="Non Billable",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=10000)
        db_session.add(wallet)

        subscription = Subscription(user_id=user.id, plan="free", monthly_fee=0, commission_rate=1000)
        db_session.add(subscription)
        await db_session.flush()

        # Act - PAUSE 操作不計費
        action = await BillingService.charge_action_commission(
            db_session, user.id, "PAUSE", "meta", 10000
        )

        # Assert
        assert action is None
        await db_session.refresh(wallet)
        assert wallet.balance == 10000  # 餘額不變


class TestBillingServiceAI:
    """測試 AI 計費"""

    @pytest.mark.asyncio
    async def test_ai_copywriting_uses_quota_first(self, db_session: AsyncSession):
        """測試 AI 文案先使用配額"""
        # Arrange
        user = User(
            email="ai_quota@example.com",
            name="AI Quota",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
            monthly_copywriting_quota=50,
            monthly_copywriting_used=0,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        result = await BillingService.charge_ai_usage(db_session, user.id, "copywriting")

        # Assert
        assert result is True
        await db_session.refresh(subscription)
        assert subscription.monthly_copywriting_used == 1
        await db_session.refresh(wallet)
        assert wallet.balance == 1000  # 餘額不變（使用配額）

    @pytest.mark.asyncio
    async def test_ai_copywriting_charges_when_quota_exceeded(self, db_session: AsyncSession):
        """測試 AI 文案超過配額時收費"""
        # Arrange
        user = User(
            email="ai_exceed@example.com",
            name="AI Exceed",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
            monthly_copywriting_quota=50,
            monthly_copywriting_used=50,  # 配額已用完
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        result = await BillingService.charge_ai_usage(db_session, user.id, "copywriting")

        # Assert
        assert result is True
        await db_session.refresh(wallet)
        # Pro 方案超額文案價格是 5 元
        assert wallet.balance == 995

    @pytest.mark.asyncio
    async def test_ai_audience_always_charges(self, db_session: AsyncSession):
        """測試 AI 受眾分析總是收費"""
        # Arrange
        user = User(
            email="ai_audience@example.com",
            name="AI Audience",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        result = await BillingService.charge_ai_usage(db_session, user.id, "audience")

        # Assert
        assert result is True
        await db_session.refresh(wallet)
        assert wallet.balance == 800  # 1000 - 200

    @pytest.mark.asyncio
    async def test_ai_image_uses_quota_first(self, db_session: AsyncSession):
        """測試 AI 圖片先使用配額"""
        # Arrange
        user = User(
            email="ai_image@example.com",
            name="AI Image",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=1000)
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="pro",
            monthly_fee=1500,
            commission_rate=500,
            monthly_image_quota=10,
            monthly_image_used=0,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        result = await BillingService.charge_ai_usage(db_session, user.id, "image")

        # Assert
        assert result is True
        await db_session.refresh(subscription)
        assert subscription.monthly_image_used == 1
        await db_session.refresh(wallet)
        assert wallet.balance == 1000  # 餘額不變


class TestBillingServiceBlockAction:
    """測試餘額不足阻擋"""

    @pytest.mark.asyncio
    async def test_insufficient_balance_blocks_action(self, db_session: AsyncSession):
        """測試餘額不足時阻擋操作"""
        # Arrange
        user = User(
            email="block_action@example.com",
            name="Block Action",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        wallet = Wallet(user_id=user.id, balance=50)  # 餘額不足
        db_session.add(wallet)

        subscription = Subscription(
            user_id=user.id,
            plan="free",
            monthly_fee=0,
            commission_rate=1000,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        can_perform, message = await BillingService.can_perform_action(
            db_session, user.id, 1000  # 需要 1000 元
        )

        # Assert
        assert can_perform is False
        assert "餘額不足" in message


class TestBillingServiceUpgrade:
    """測試方案升級"""

    @pytest.mark.asyncio
    async def test_upgrade_plan_changes_commission_rate(self, db_session: AsyncSession):
        """測試升級方案變更抽成費率"""
        # Arrange
        user = User(
            email="upgrade@example.com",
            name="Upgrade",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        subscription = Subscription(
            user_id=user.id,
            plan="free",
            monthly_fee=0,
            commission_rate=1000,
        )
        db_session.add(subscription)
        await db_session.flush()

        # Act
        updated_sub = await BillingService.upgrade_plan(db_session, user.id, "pro")

        # Assert
        assert updated_sub.plan == "pro"
        assert updated_sub.monthly_fee == 1500
        assert updated_sub.commission_rate == 500
        assert updated_sub.monthly_copywriting_quota == 50
        assert updated_sub.monthly_image_quota == 10
