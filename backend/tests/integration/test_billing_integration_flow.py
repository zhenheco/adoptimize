# -*- coding: utf-8 -*-
"""
BillingIntegration 整合測試

測試 BillingIntegration 服務的完整流程，包含：
- AI 使用前檢查（配額/餘額）
- AI 使用後扣費
- 操作執行前檢查（餘額）
- 操作執行後扣費

這是 Phase 7 的 TDD 測試
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.wallet_service import WalletService
from app.services.billing_service import BillingService
from app.services.billing_integration import BillingIntegration


class TestAICopywritingIntegrationFlow:
    """AI 文案生成完整流程測試"""

    @pytest.mark.asyncio
    async def test_copywriting_with_quota_flow(self, db_session: AsyncSession):
        """
        測試 Pro 方案用戶使用 AI 文案（有配額）的完整流程

        1. 建立 Pro 用戶
        2. 檢查可以使用（uses_quota=True）
        3. 扣費（消耗配額）
        4. 確認配額減少、餘額不變
        """
        # Arrange
        user = User(
            email="pro_copywriting@example.com",
            name="Pro User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 升級到 Pro 並儲值
        await BillingService.upgrade_plan(db_session, user.id, "pro")
        await WalletService.deposit(db_session, user.id, 1000, "儲值")
        initial_balance = await WalletService.get_balance(db_session, user.id)

        # Act - 檢查
        result = await BillingIntegration.can_use_ai_copywriting(db_session, user.id)

        # Assert - 可以使用且使用配額
        assert result.can_use is True
        assert result.uses_quota is True
        assert result.estimated_cost == 0

        # Act - 扣費
        charged = await BillingIntegration.charge_ai_copywriting(
            db_session, user.id, uses_quota=True
        )

        # Assert - 扣費成功
        assert charged is True

        # 餘額不變（使用配額）
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == initial_balance

        # 配額減少
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        assert subscription.monthly_copywriting_used == 1

    @pytest.mark.asyncio
    async def test_copywriting_without_quota_flow(self, db_session: AsyncSession):
        """
        測試 Free 方案用戶使用 AI 文案（無配額）的完整流程

        1. 建立 Free 用戶
        2. 儲值
        3. 檢查可以使用（uses_quota=False, estimated_cost=5）
        4. 扣費（從錢包扣款）
        5. 確認餘額減少
        """
        # Arrange
        user = User(
            email="free_copywriting@example.com",
            name="Free User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 儲值
        await WalletService.deposit(db_session, user.id, 100, "儲值")
        initial_balance = await WalletService.get_balance(db_session, user.id)

        # Act - 檢查
        result = await BillingIntegration.can_use_ai_copywriting(db_session, user.id)

        # Assert - 可以使用但需付費
        assert result.can_use is True
        assert result.uses_quota is False
        assert result.estimated_cost == 5  # Free plan price

        # Act - 扣費
        charged = await BillingIntegration.charge_ai_copywriting(
            db_session, user.id, uses_quota=False
        )

        # Assert
        assert charged is True

        # 餘額減少 5 元
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == initial_balance - 5

    @pytest.mark.asyncio
    async def test_copywriting_insufficient_balance_flow(self, db_session: AsyncSession):
        """
        測試餘額不足時阻擋 AI 文案使用

        1. 建立 Free 用戶（無配額）
        2. 不儲值
        3. 檢查不可使用
        """
        # Arrange
        user = User(
            email="poor_copywriting@example.com",
            name="Poor User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # 不儲值，餘額為 0

        # Act
        result = await BillingIntegration.can_use_ai_copywriting(db_session, user.id)

        # Assert
        assert result.can_use is False
        assert "餘額不足" in result.message


class TestAIAudienceIntegrationFlow:
    """AI 受眾分析完整流程測試"""

    @pytest.mark.asyncio
    async def test_audience_always_charges(self, db_session: AsyncSession):
        """
        測試 AI 受眾分析總是收費（無配額）

        1. 建立用戶並儲值
        2. 檢查可以使用（uses_quota=False, estimated_cost=200）
        3. 扣費
        4. 確認餘額減少 200
        """
        # Arrange
        user = User(
            email="audience_flow@example.com",
            name="Audience User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        await WalletService.deposit(db_session, user.id, 1000, "儲值")
        initial_balance = await WalletService.get_balance(db_session, user.id)

        # Act - 檢查
        result = await BillingIntegration.can_use_ai_audience(db_session, user.id)

        # Assert
        assert result.can_use is True
        assert result.uses_quota is False
        assert result.estimated_cost == 200

        # Act - 扣費
        charged = await BillingIntegration.charge_ai_audience(db_session, user.id)

        # Assert
        assert charged is True
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == initial_balance - 200


class TestActionIntegrationFlow:
    """操作計費完整流程測試"""

    @pytest.mark.asyncio
    async def test_billable_action_flow(self, db_session: AsyncSession):
        """
        測試計費操作的完整流程

        1. 建立 Free 用戶（10% 抽成）
        2. 儲值
        3. 檢查可以執行（estimated_fee=1000）
        4. 執行並扣費
        5. 確認餘額減少
        """
        # Arrange
        user = User(
            email="action_flow@example.com",
            name="Action User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        await WalletService.deposit(db_session, user.id, 5000, "儲值")
        initial_balance = await WalletService.get_balance(db_session, user.id)

        # Act - 檢查
        result = await BillingIntegration.can_execute_action(
            db_session, user.id, "CREATE_CAMPAIGN", ad_spend=10000
        )

        # Assert - 可以執行，預估費用 1000（10%）
        assert result.can_execute is True
        assert result.estimated_fee == 1000

        # Act - 扣費
        charged = await BillingIntegration.charge_action(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 10000
        )

        # Assert
        assert charged is True
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == initial_balance - 1000

    @pytest.mark.asyncio
    async def test_free_action_no_charge(self, db_session: AsyncSession):
        """
        測試免費操作不收費

        1. 建立用戶
        2. 檢查 PAUSE 操作（免費）
        3. 確認 estimated_fee=0
        """
        # Arrange
        user = User(
            email="free_action@example.com",
            name="Free Action User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        # Act
        result = await BillingIntegration.can_execute_action(
            db_session, user.id, "PAUSE", ad_spend=10000
        )

        # Assert
        assert result.can_execute is True
        assert result.estimated_fee == 0
        assert "免費" in result.message

    @pytest.mark.asyncio
    async def test_action_insufficient_balance(self, db_session: AsyncSession):
        """
        測試餘額不足時阻擋操作

        1. 建立用戶並儲值少量
        2. 檢查大額操作
        3. 確認被阻擋
        """
        # Arrange
        user = User(
            email="poor_action@example.com",
            name="Poor Action User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        await WalletService.deposit(db_session, user.id, 100, "儲值")

        # Act - 10000 * 10% = 1000，但只有 100 餘額
        result = await BillingIntegration.can_execute_action(
            db_session, user.id, "CREATE_CAMPAIGN", ad_spend=10000
        )

        # Assert
        assert result.can_execute is False
        assert "餘額不足" in result.message


class TestUpgradeAndRateChange:
    """升級方案與費率變更測試"""

    @pytest.mark.asyncio
    async def test_upgrade_changes_commission_rate(self, db_session: AsyncSession):
        """
        測試升級方案後抽成費率變更

        1. Free 方案（10%）→ Pro 方案（5%）→ Agency 方案（3%）
        2. 每次升級後執行操作確認費率
        """
        # Arrange
        user = User(
            email="upgrade_rate@example.com",
            name="Upgrade User",
            password_hash="hashed",
        )
        db_session.add(user)
        await db_session.flush()

        await WalletService.deposit(db_session, user.id, 10000, "儲值")

        # Free 方案（10%）
        result = await BillingIntegration.can_execute_action(
            db_session, user.id, "CREATE_CAMPAIGN", ad_spend=1000
        )
        assert result.estimated_fee == 100  # 10%

        # 升級到 Pro（5%）
        await BillingService.upgrade_plan(db_session, user.id, "pro")
        result = await BillingIntegration.can_execute_action(
            db_session, user.id, "CREATE_CAMPAIGN", ad_spend=1000
        )
        assert result.estimated_fee == 50  # 5%

        # 升級到 Agency（3%）
        await BillingService.upgrade_plan(db_session, user.id, "agency")
        result = await BillingIntegration.can_execute_action(
            db_session, user.id, "CREATE_CAMPAIGN", ad_spend=1000
        )
        assert result.estimated_fee == 30  # 3%
