# -*- coding: utf-8 -*-
"""
計費任務單元測試
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.subscription import Subscription
from app.services.billing_service import BillingService
from app.services.wallet_service import WalletService


class TestMonthlyFeeCharge:
    """測試月費扣除邏輯"""

    @pytest.mark.asyncio
    async def test_charge_monthly_fee_success(self, db_session: AsyncSession):
        """測試成功扣除月費"""
        # Arrange
        user = User(
            email="monthly_fee@example.com",
            name="Monthly Fee Test",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 升級到 Pro 方案
        await BillingService.upgrade_plan(db_session, user.id, "pro")
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        assert subscription.monthly_fee == 1500

        # 儲值足夠的金額
        await WalletService.deposit(db_session, user.id, 2000, "儲值")

        # Act
        result = await BillingService.charge_subscription_fee(db_session, user.id)

        # Assert
        assert result is True
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 500  # 2000 - 1500

    @pytest.mark.asyncio
    async def test_charge_monthly_fee_insufficient_balance(self, db_session: AsyncSession):
        """測試餘額不足時月費扣除失敗"""
        # Arrange
        user = User(
            email="insufficient@example.com",
            name="Insufficient Balance",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 升級到 Pro 方案
        await BillingService.upgrade_plan(db_session, user.id, "pro")

        # 儲值不足的金額
        await WalletService.deposit(db_session, user.id, 1000, "儲值")

        # Act
        result = await BillingService.charge_subscription_fee(db_session, user.id)

        # Assert
        assert result is False
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 1000  # 餘額不變

    @pytest.mark.asyncio
    async def test_free_plan_no_charge(self, db_session: AsyncSession):
        """測試免費方案不扣月費"""
        # Arrange
        user = User(
            email="free_plan@example.com",
            name="Free Plan",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 確認是免費方案
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        assert subscription.plan == "free"
        assert subscription.monthly_fee == 0

        # Act
        result = await BillingService.charge_subscription_fee(db_session, user.id)

        # Assert
        assert result is True  # 免費方案視為成功


class TestMonthlyQuotaReset:
    """測試配額重置邏輯"""

    @pytest.mark.asyncio
    async def test_reset_quotas(self, db_session: AsyncSession):
        """測試重置配額"""
        # Arrange
        user = User(
            email="quota_reset@example.com",
            name="Quota Reset",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 升級到 Pro 方案並使用一些配額
        await BillingService.upgrade_plan(db_session, user.id, "pro")
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        subscription.monthly_copywriting_used = 30
        subscription.monthly_image_used = 5
        await db_session.flush()

        # Act
        await BillingService.reset_monthly_quotas(db_session, user.id)
        await db_session.refresh(subscription)

        # Assert
        assert subscription.monthly_copywriting_used == 0
        assert subscription.monthly_image_used == 0

    @pytest.mark.asyncio
    async def test_reset_preserves_quota_limits(self, db_session: AsyncSession):
        """測試重置不影響配額上限"""
        # Arrange
        user = User(
            email="preserve_limits@example.com",
            name="Preserve Limits",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        await BillingService.upgrade_plan(db_session, user.id, "pro")
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        original_copywriting_quota = subscription.monthly_copywriting_quota
        original_image_quota = subscription.monthly_image_quota

        # Act
        await BillingService.reset_monthly_quotas(db_session, user.id)
        await db_session.refresh(subscription)

        # Assert
        assert subscription.monthly_copywriting_quota == original_copywriting_quota
        assert subscription.monthly_image_quota == original_image_quota


class TestAgencyPlanBilling:
    """測試 Agency 方案計費"""

    @pytest.mark.asyncio
    async def test_agency_plan_monthly_fee(self, db_session: AsyncSession):
        """測試 Agency 方案月費"""
        # Arrange
        user = User(
            email="agency@example.com",
            name="Agency User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 升級到 Agency 方案
        await BillingService.upgrade_plan(db_session, user.id, "agency")
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        assert subscription.monthly_fee == 7500
        assert subscription.commission_rate == 300  # 3%

        # 儲值足夠的金額
        await WalletService.deposit(db_session, user.id, 10000, "儲值")

        # Act
        result = await BillingService.charge_subscription_fee(db_session, user.id)

        # Assert
        assert result is True
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 2500  # 10000 - 7500
