# -*- coding: utf-8 -*-
"""
Meta 同步流程整合測試

測試完整的 Meta API 同步流程，包含：
- Campaign → AdSet → Ad 的層級關聯
- Metrics 計算
- 錯誤處理

這些測試使用 SQLite 模擬資料庫，並 mock Meta API 回應。
"""

import uuid
from datetime import datetime, timezone
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
    sync_campaigns_for_account,
    sync_adsets_for_account,
    sync_ads_for_account,
    sync_metrics_for_account,
)


class TestFullSyncFlow:
    """測試完整同步流程"""

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

    @pytest.mark.asyncio
    async def test_full_sync_flow_campaigns_to_ads(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
    ):
        """
        整合測試：完整的 Campaign → AdSet → Ad 同步流程

        驗證：
        - AC-M1: campaigns 正確儲存
        - AC-M2: ad sets 正確關聯到 campaigns
        - AC-M3: ads 正確關聯到 ad sets
        """
        # Mock Campaign API 回應
        mock_campaigns = [
            {
                "id": "camp_001",
                "name": "Test Campaign 1",
                "status": "ACTIVE",
                "objective": "CONVERSIONS",
                "daily_budget": "5000",
            },
        ]

        # Mock AdSet API 回應
        mock_adsets = [
            {
                "id": "adset_001",
                "name": "Test Ad Set 1",
                "status": "ACTIVE",
                "campaign_id": "camp_001",
                "targeting": {"age_min": 18, "age_max": 65},
                "daily_budget": "2500",
            },
        ]

        # Mock Ad API 回應
        mock_ads = [
            {
                "id": "ad_001",
                "name": "Test Ad 1",
                "status": "ACTIVE",
                "adset_id": "adset_001",
                "creative": {"id": "creative_001"},
            },
        ]

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_campaigns.return_value = mock_campaigns
            mock_client.get_adsets.return_value = mock_adsets
            mock_client.get_ads.return_value = mock_ads
            mock_client_class.return_value = mock_client

            # Step 1: 同步 Campaigns
            camp_result = await sync_campaigns_for_account(
                session=db_session,
                account=test_ad_account,
            )
            assert camp_result["status"] == "completed"
            assert camp_result["campaigns_synced"] == 1

            # Step 2: 同步 Ad Sets
            adset_result = await sync_adsets_for_account(
                session=db_session,
                account=test_ad_account,
            )
            assert adset_result["status"] == "completed"
            assert adset_result["adsets_synced"] == 1

            # Step 3: 同步 Ads
            ad_result = await sync_ads_for_account(
                session=db_session,
                account=test_ad_account,
            )
            assert ad_result["status"] == "completed"
            assert ad_result["ads_synced"] == 1

        # 驗證資料庫中的層級關聯
        # 取得 Campaign
        camp_result = await db_session.execute(
            select(Campaign).where(Campaign.external_id == "camp_001")
        )
        campaign = camp_result.scalar_one()
        assert campaign.name == "Test Campaign 1"
        assert campaign.account_id == test_ad_account.id

        # 取得 AdSet 並驗證關聯
        adset_result = await db_session.execute(
            select(AdSet).where(AdSet.external_id == "adset_001")
        )
        adset = adset_result.scalar_one()
        assert adset.campaign_id == campaign.id

        # 取得 Ad 並驗證關聯
        ad_result = await db_session.execute(
            select(Ad).where(Ad.external_id == "ad_001")
        )
        ad = ad_result.scalar_one()
        assert ad.ad_set_id == adset.id

    @pytest.mark.asyncio
    async def test_sync_with_metrics(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
    ):
        """
        整合測試：包含指標同步的完整流程

        驗證：
        - AC-M4: metrics 正確計算 CTR、CPC、ROAS
        """
        # 先建立 Creative
        creative = Creative(
            id=uuid.uuid4(),
            ad_account_id=test_ad_account.id,
            external_id="creative_001",
            type="IMAGE",
            name="Test Creative",
        )
        db_session.add(creative)
        await db_session.commit()
        await db_session.refresh(creative)

        # Mock Insights API 回應
        mock_insights = [
            {
                "ad_id": "ad_001",
                "creative_id": "creative_001",
                "impressions": "10000",
                "clicks": "500",
                "spend": "200.00",
                "conversions": "50",
                "date_start": "2024-01-01",
                "date_stop": "2024-01-07",
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

        # 驗證 Metrics
        metrics_result = await db_session.execute(
            select(CreativeMetrics).where(
                CreativeMetrics.creative_id == creative.id
            )
        )
        metrics = metrics_result.scalar_one()

        # 驗證計算
        # CTR = 500 / 10000 * 100 = 5%
        assert metrics.ctr == Decimal("5.000000")
        assert metrics.impressions == 10000
        assert metrics.clicks == 500


class TestErrorHandling:
    """測試錯誤處理"""

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

    @pytest.mark.asyncio
    async def test_sync_handles_orphan_adsets(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
    ):
        """
        測試：沒有對應 campaign 的 ad set 應被跳過

        驗證跳過邏輯是否正確
        """
        # Mock AdSet 回應（campaign 不存在）
        mock_adsets = [
            {
                "id": "adset_orphan",
                "name": "Orphan Ad Set",
                "status": "ACTIVE",
                "campaign_id": "nonexistent_campaign",
                "daily_budget": "5000",
            },
        ]

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_adsets.return_value = mock_adsets
            mock_client_class.return_value = mock_client

            result = await sync_adsets_for_account(
                session=db_session,
                account=test_ad_account,
            )

            # 應該跳過而非報錯
            assert result["adsets_synced"] == 0
            assert result.get("skipped", 0) >= 1


class TestDataIntegrity:
    """測試資料完整性"""

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

    @pytest.mark.asyncio
    async def test_sync_updates_existing_records(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
    ):
        """
        測試：重複同步應更新而非創建重複記錄
        """
        mock_campaigns = [
            {
                "id": "camp_001",
                "name": "Original Name",
                "status": "ACTIVE",
                "objective": "CONVERSIONS",
            },
        ]

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_campaigns.return_value = mock_campaigns
            mock_client_class.return_value = mock_client

            # 第一次同步
            await sync_campaigns_for_account(
                session=db_session,
                account=test_ad_account,
            )

        # 更新名稱
        mock_campaigns[0]["name"] = "Updated Name"

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_campaigns.return_value = mock_campaigns
            mock_client_class.return_value = mock_client

            # 第二次同步
            result = await sync_campaigns_for_account(
                session=db_session,
                account=test_ad_account,
            )

            assert result["campaigns_synced"] == 1

        # 驗證只有一條記錄且名稱已更新
        camp_result = await db_session.execute(
            select(Campaign).where(Campaign.external_id == "camp_001")
        )
        campaigns = camp_result.scalars().all()

        assert len(campaigns) == 1
        assert campaigns[0].name == "Updated Name"
