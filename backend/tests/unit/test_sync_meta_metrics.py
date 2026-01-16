# -*- coding: utf-8 -*-
"""
Meta Metrics 同步測試

測試驗收標準：
- AC-M4: sync_metrics() 能取得 insights 並計算 CTR、CPC、ROAS
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.models.creative import Creative
from app.models.creative_metrics import CreativeMetrics
from app.workers.sync_meta import (
    sync_metrics_for_account,
    calculate_ctr,
    calculate_cpc,
    calculate_roas,
)


class TestMetricsCalculations:
    """測試指標計算函數"""

    def test_calculate_ctr(self):
        """計算 CTR (Click-Through Rate)"""
        # 正常情況
        assert calculate_ctr(100, 1000) == Decimal("10.000000")
        assert calculate_ctr(50, 500) == Decimal("10.000000")

        # 小數情況
        result = calculate_ctr(3, 100)
        assert result == Decimal("3.000000")

    def test_calculate_ctr_zero_impressions(self):
        """AC-M4: 處理零除數情況"""
        result = calculate_ctr(0, 0)
        assert result == Decimal("0")

        result = calculate_ctr(100, 0)
        assert result == Decimal("0")

    def test_calculate_cpc(self):
        """計算 CPC (Cost Per Click)"""
        # 正常情況
        result = calculate_cpc(Decimal("100.00"), 50)
        assert result == Decimal("2.00")

        result = calculate_cpc(Decimal("150.50"), 100)
        assert result == Decimal("1.50")  # 1.505 -> 1.50 (banker's rounding)

    def test_calculate_cpc_zero_clicks(self):
        """AC-M4: 處理零除數情況"""
        result = calculate_cpc(Decimal("100.00"), 0)
        assert result == Decimal("0")

    def test_calculate_roas(self):
        """計算 ROAS (Return on Ad Spend)"""
        # 正常情況：轉換價值 $500，花費 $100，ROAS = 5.0
        result = calculate_roas(Decimal("500.00"), Decimal("100.00"))
        assert result == Decimal("5.00")

        # 低 ROAS 情況
        result = calculate_roas(Decimal("50.00"), Decimal("100.00"))
        assert result == Decimal("0.50")

    def test_calculate_roas_zero_spend(self):
        """AC-M4: 處理零除數情況"""
        result = calculate_roas(Decimal("500.00"), Decimal("0"))
        assert result == Decimal("0")


class TestSyncMetrics:
    """測試 metrics 同步功能"""

    @pytest_asyncio.fixture
    async def test_ad_account(self, db_session: AsyncSession):
        """建立測試用的廣告帳戶"""
        account = AdAccount(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            platform="meta",
            external_id="123456789",
            name="Test Ad Account",
            status="active",
            access_token="test_access_token",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)
        return account

    @pytest_asyncio.fixture
    async def test_creative(self, db_session: AsyncSession, test_ad_account: AdAccount):
        """建立測試用的 creative"""
        creative = Creative(
            id=uuid.uuid4(),
            account_id=test_ad_account.id,
            external_id="creative_001",
            type="IMAGE",
            headline="Test Creative",
        )
        db_session.add(creative)
        await db_session.commit()
        await db_session.refresh(creative)
        return creative

    @pytest.mark.asyncio
    async def test_sync_metrics_calculates_ctr(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
        test_creative: Creative,
    ):
        """AC-M4: 應正確計算 CTR"""
        mock_insights = [
            {
                "ad_id": "ad_001",
                "creative_id": "creative_001",
                "impressions": "10000",
                "clicks": "500",
                "spend": "150.00",
                "conversions": "50",
                "date_start": "2024-01-01",
                "date_stop": "2024-01-01",
            },
        ]

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_insights.return_value = mock_insights
            mock_client_class.return_value = mock_client

            result = await sync_metrics_for_account(
                session=db_session,
                account=test_ad_account,
            )

            assert result["status"] == "completed"
            assert result["metrics_synced"] >= 1

            # 驗證 CTR 計算
            metrics_result = await db_session.execute(
                select(CreativeMetrics).where(
                    CreativeMetrics.creative_id == test_creative.id
                )
            )
            metrics = metrics_result.scalar_one()

            # CTR = 500 / 10000 * 100 = 5%
            assert metrics.ctr == Decimal("5.000000")
            assert metrics.impressions == 10000
            assert metrics.clicks == 500

    @pytest.mark.asyncio
    async def test_sync_metrics_handles_zero_division(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
        test_creative: Creative,
    ):
        """AC-M4: 處理零除數情況"""
        mock_insights = [
            {
                "ad_id": "ad_001",
                "creative_id": "creative_001",
                "impressions": "0",
                "clicks": "0",
                "spend": "0.00",
                "conversions": "0",
                "date_start": "2024-01-01",
                "date_stop": "2024-01-01",
            },
        ]

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_insights.return_value = mock_insights
            mock_client_class.return_value = mock_client

            result = await sync_metrics_for_account(
                session=db_session,
                account=test_ad_account,
            )

            assert result["status"] == "completed"

            # 應該不會拋出 ZeroDivisionError
            metrics_result = await db_session.execute(
                select(CreativeMetrics).where(
                    CreativeMetrics.creative_id == test_creative.id
                )
            )
            metrics = metrics_result.scalar_one()

            assert metrics.ctr == Decimal("0")
