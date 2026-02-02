# -*- coding: utf-8 -*-
"""
計費整合測試

測試驗收標準：
- AC-INT1: AI 文案生成前檢查配額和餘額
- AC-INT2: AI 文案生成後正確扣費或消耗配額
- AC-INT3: 餘額不足時阻擋操作
- AC-INT4: 操作執行前檢查餘額
"""

import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from app.services.billing_integration import BillingIntegration


class TestAICopywritingBilling:
    """AI 文案生成計費測試"""

    @pytest.mark.asyncio
    async def test_can_generate_with_quota_remaining(self):
        """AC-INT1: 有配額剩餘時應可生成"""
        mock_db = AsyncMock()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing:
            mock_billing.get_ai_quota_status = AsyncMock(
                return_value={
                    "copywriting": {"quota": 50, "used": 10, "remaining": 40},
                    "image": {"quota": 10, "used": 5, "remaining": 5},
                }
            )

            result = await BillingIntegration.can_use_ai_copywriting(
                mock_db, uuid.uuid4()
            )

            assert result.can_use is True
            assert result.uses_quota is True
            assert result.estimated_cost == 0

    @pytest.mark.asyncio
    async def test_can_generate_with_balance_when_no_quota(self):
        """AC-INT1: 無配額但有餘額時應可生成（需付費）"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing, patch(
            "app.services.billing_integration.WalletService"
        ) as mock_wallet:
            mock_billing.get_ai_quota_status = AsyncMock(
                return_value={
                    "copywriting": {"quota": 0, "used": 0, "remaining": 0},
                    "image": {"quota": 0, "used": 0, "remaining": 0},
                }
            )
            mock_billing.get_or_create_subscription = AsyncMock(
                return_value=MagicMock(plan="free")
            )
            mock_wallet.get_balance = AsyncMock(return_value=Decimal("1000"))

            result = await BillingIntegration.can_use_ai_copywriting(mock_db, user_id)

            assert result.can_use is True
            assert result.uses_quota is False
            assert result.estimated_cost == 5  # Free plan copywriting price

    @pytest.mark.asyncio
    async def test_cannot_generate_with_insufficient_balance(self):
        """AC-INT3: 無配額且餘額不足時應無法生成"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing, patch(
            "app.services.billing_integration.WalletService"
        ) as mock_wallet:
            mock_billing.get_ai_quota_status = AsyncMock(
                return_value={
                    "copywriting": {"quota": 0, "used": 0, "remaining": 0},
                    "image": {"quota": 0, "used": 0, "remaining": 0},
                }
            )
            mock_billing.get_or_create_subscription = AsyncMock(
                return_value=MagicMock(plan="free")
            )
            mock_wallet.get_balance = AsyncMock(return_value=Decimal("0"))

            result = await BillingIntegration.can_use_ai_copywriting(mock_db, user_id)

            assert result.can_use is False
            assert "餘額不足" in result.message

    @pytest.mark.asyncio
    async def test_charge_ai_copywriting_uses_quota_first(self):
        """AC-INT2: 有配額時應優先使用配額"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing:
            mock_billing.charge_ai_usage = AsyncMock(return_value=True)

            result = await BillingIntegration.charge_ai_copywriting(
                mock_db, user_id, uses_quota=True
            )

            mock_billing.charge_ai_usage.assert_called_once_with(
                mock_db, user_id, "copywriting"
            )
            assert result is True

    @pytest.mark.asyncio
    async def test_charge_ai_copywriting_deducts_from_wallet(self):
        """AC-INT2: 無配額時應從錢包扣款"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing:
            mock_billing.charge_ai_usage = AsyncMock(return_value=True)

            result = await BillingIntegration.charge_ai_copywriting(
                mock_db, user_id, uses_quota=False
            )

            mock_billing.charge_ai_usage.assert_called_once()
            assert result is True


class TestAIImageBilling:
    """AI 圖片生成計費測試"""

    @pytest.mark.asyncio
    async def test_can_generate_image_with_quota(self):
        """AC-INT1: 有配額時應可生成圖片"""
        mock_db = AsyncMock()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing:
            mock_billing.get_ai_quota_status = AsyncMock(
                return_value={
                    "copywriting": {"quota": 50, "used": 50, "remaining": 0},
                    "image": {"quota": 10, "used": 5, "remaining": 5},
                }
            )

            result = await BillingIntegration.can_use_ai_image(mock_db, uuid.uuid4())

            assert result.can_use is True
            assert result.uses_quota is True


class TestAIAudienceBilling:
    """AI 受眾分析計費測試"""

    @pytest.mark.asyncio
    async def test_audience_always_charges(self):
        """AC-INT2: 受眾分析應總是收費（無配額）"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing, patch(
            "app.services.billing_integration.WalletService"
        ) as mock_wallet:
            mock_billing.get_or_create_subscription = AsyncMock(
                return_value=MagicMock(plan="free")
            )
            mock_wallet.get_balance = AsyncMock(return_value=Decimal("1000"))

            result = await BillingIntegration.can_use_ai_audience(mock_db, user_id)

            assert result.can_use is True
            assert result.uses_quota is False
            assert result.estimated_cost == 200  # AI audience price


class TestActionBilling:
    """操作計費測試"""

    @pytest.mark.asyncio
    async def test_can_execute_billable_action_with_balance(self):
        """AC-INT4: 有餘額時應可執行計費操作"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing, patch(
            "app.services.billing_integration.WalletService"
        ) as mock_wallet:
            mock_billing.get_or_create_subscription = AsyncMock(
                return_value=MagicMock(commission_rate=1000)  # 10% (千分比: 1000/10000)
            )
            mock_wallet.get_balance = AsyncMock(return_value=Decimal("5000"))

            result = await BillingIntegration.can_execute_action(
                mock_db, user_id, "CREATE_CAMPAIGN", ad_spend=10000
            )

            assert result.can_execute is True
            assert result.estimated_fee == 1000  # 10000 * 10%

    @pytest.mark.asyncio
    async def test_cannot_execute_with_insufficient_balance(self):
        """AC-INT3: 餘額不足時應無法執行計費操作"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.BillingService"
        ) as mock_billing, patch(
            "app.services.billing_integration.WalletService"
        ) as mock_wallet:
            mock_billing.get_or_create_subscription = AsyncMock(
                return_value=MagicMock(commission_rate=1000)  # 10% (千分比: 1000/10000)
            )
            mock_wallet.get_balance = AsyncMock(return_value=Decimal("500"))

            result = await BillingIntegration.can_execute_action(
                mock_db, user_id, "CREATE_CAMPAIGN", ad_spend=10000
            )

            assert result.can_execute is False
            assert "餘額不足" in result.message

    @pytest.mark.asyncio
    async def test_free_action_always_allowed(self):
        """AC-INT4: 免費操作應總是允許"""
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        with patch(
            "app.services.billing_integration.is_billable_action"
        ) as mock_is_billable:
            mock_is_billable.return_value = False

            result = await BillingIntegration.can_execute_action(
                mock_db, user_id, "PAUSE", ad_spend=0
            )

            assert result.can_execute is True
            assert result.estimated_fee == 0
