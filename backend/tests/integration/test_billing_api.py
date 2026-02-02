# -*- coding: utf-8 -*-
"""
計費 API 整合測試

測試 BillingService 和 WalletService 的完整流程
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.wallet import Wallet
from app.models.subscription import Subscription
from app.services.wallet_service import WalletService
from app.services.billing_service import BillingService
from app.services.billing_config import PRICING_PLANS


class TestFullBillingFlow:
    """測試完整計費流程"""

    @pytest.mark.asyncio
    async def test_full_billing_flow(self, db_session: AsyncSession):
        """
        測試完整計費流程：
        1. 註冊新用戶 → 確認 Free 方案
        2. 查看錢包 → 餘額為 0
        3. 儲值 NT$1000 → 餘額變 1000
        4. 使用 AI 受眾分析 → 扣 NT$200
        5. 使用 AI 文案生成 → 扣 NT$5（Free 無配額）
        6. 執行廣告操作（預算 $10000） → 扣 10% = NT$1000（餘額不足應阻擋）
        7. 再儲值 → 餘額增加
        8. 執行廣告操作 → 成功扣款
        """
        # 1. 建立新用戶
        user = User(
            email="full_flow@example.com",
            name="Full Flow Test",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # 確認預設為 Free 方案
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        assert subscription.plan == "free"
        assert subscription.commission_rate == 1000  # 10%

        # 2. 查看餘額
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 0

        # 3. 儲值
        await WalletService.deposit(db_session, user.id, 1000, "首次儲值")
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 1000

        # 4. 使用 AI 受眾分析
        result = await BillingService.charge_ai_usage(db_session, user.id, "audience")
        assert result is True
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 800  # 1000 - 200

        # 5. 使用 AI 文案生成（Free 無配額，直接收費）
        result = await BillingService.charge_ai_usage(db_session, user.id, "copywriting")
        assert result is True
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 795  # 800 - 5

        # 6. 檢查是否可以執行廣告操作
        can_perform, message = await BillingService.can_perform_action(
            db_session, user.id, 1000  # 需要 1000 元
        )
        assert can_perform is False  # 餘額不足
        assert "餘額不足" in message

        # 7. 再儲值
        await WalletService.deposit(db_session, user.id, 5000, "第二次儲值")
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 5795

        # 8. 執行廣告操作
        action = await BillingService.charge_action_commission(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 10000
        )
        assert action is not None
        assert action.commission_amount == 1000  # 10% of 10000
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 4795  # 5795 - 1000

    @pytest.mark.asyncio
    async def test_upgrade_and_commission_change(self, db_session: AsyncSession):
        """測試升級方案後抽成費率變更"""
        # Arrange
        user = User(
            email="upgrade_flow@example.com",
            name="Upgrade Flow",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # 儲值
        await WalletService.deposit(db_session, user.id, 10000, "儲值")

        # 確認 Free 方案的抽成
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        assert subscription.commission_rate == 1000  # 10%

        # 執行操作，確認 10% 抽成
        action1 = await BillingService.charge_action_commission(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 5000
        )
        assert action1.commission_amount == 500  # 5000 * 10%

        # 升級到 Pro
        await BillingService.upgrade_plan(db_session, user.id, "pro")
        await db_session.refresh(subscription)
        assert subscription.plan == "pro"
        assert subscription.commission_rate == 500  # 5%

        # 再次執行操作，確認 5% 抽成
        action2 = await BillingService.charge_action_commission(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 5000
        )
        assert action2.commission_amount == 250  # 5000 * 5%

    @pytest.mark.asyncio
    async def test_quota_system(self, db_session: AsyncSession):
        """測試配額系統"""
        # Arrange
        user = User(
            email="quota_flow@example.com",
            name="Quota Flow",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # 升級到 Pro（有配額）
        await BillingService.upgrade_plan(db_session, user.id, "pro")

        # 儲值
        await WalletService.deposit(db_session, user.id, 1000, "儲值")

        # 檢查配額
        subscription = await BillingService.get_or_create_subscription(db_session, user.id)
        assert subscription.monthly_copywriting_quota == 50
        assert subscription.monthly_copywriting_used == 0

        # 使用文案（應該消耗配額，不扣費）
        initial_balance = await WalletService.get_balance(db_session, user.id)
        for _ in range(3):
            await BillingService.charge_ai_usage(db_session, user.id, "copywriting")

        await db_session.refresh(subscription)
        assert subscription.monthly_copywriting_used == 3

        # 餘額應該不變（使用配額）
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == initial_balance

    @pytest.mark.asyncio
    async def test_transaction_history_accuracy(self, db_session: AsyncSession):
        """測試交易紀錄準確性"""
        # Arrange
        user = User(
            email="history_flow@example.com",
            name="History Flow",
            password_hash="hashed_password",
        )
        db_session.add(user)
        await db_session.flush()

        # 執行多種操作
        await WalletService.deposit(db_session, user.id, 10000, "儲值")
        await BillingService.charge_ai_usage(db_session, user.id, "audience")  # -200
        await BillingService.charge_action_commission(
            db_session, user.id, "CREATE_CAMPAIGN", "meta", 5000
        )  # -500 (10% of 5000)

        # 檢查交易紀錄
        transactions = await WalletService.get_transaction_history(db_session, user.id)
        assert len(transactions) == 3

        # 驗證交易類型
        tx_types = {tx.type for tx in transactions}
        assert "deposit" in tx_types
        assert "ai_audience" in tx_types
        assert "action_fee" in tx_types

        # 最終餘額
        balance = await WalletService.get_balance(db_session, user.id)
        assert balance == 9300  # 10000 - 200 - 500

    @pytest.mark.asyncio
    async def test_pricing_plans_complete(self, db_session: AsyncSession):
        """測試所有定價方案配置完整"""
        assert "free" in PRICING_PLANS
        assert "pro" in PRICING_PLANS
        assert "agency" in PRICING_PLANS

        # 驗證所有方案都有必要欄位
        required_fields = [
            "monthly_fee",
            "commission_rate",
            "ai_audience_price",
            "ai_copywriting_price",
            "ai_image_price",
            "monthly_copywriting_quota",
            "monthly_image_quota",
        ]

        for plan_name, config in PRICING_PLANS.items():
            for field in required_fields:
                assert field in config, f"{plan_name} 缺少 {field}"
