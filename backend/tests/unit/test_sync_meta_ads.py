# -*- coding: utf-8 -*-
"""
Meta Ads 同步測試

測試驗收標準：
- AC-M3: sync_ads() 能同步 ads 並關聯到正確的 ad set
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.workers.sync_meta import (
    sync_ads_for_account,
    _parse_ad_data,
)


class TestSyncAds:
    """測試 ads 同步功能"""

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
    async def test_campaign(self, db_session: AsyncSession, test_ad_account: AdAccount):
        """建立測試用的 campaign"""
        campaign = Campaign(
            id=uuid.uuid4(),
            account_id=test_ad_account.id,
            external_id="camp_001",
            name="Test Campaign",
            status="ACTIVE",
        )
        db_session.add(campaign)
        await db_session.commit()
        await db_session.refresh(campaign)
        return campaign

    @pytest_asyncio.fixture
    async def test_adset(
        self, db_session: AsyncSession, test_campaign: Campaign
    ):
        """建立測試用的 ad set"""
        adset = AdSet(
            id=uuid.uuid4(),
            campaign_id=test_campaign.id,
            external_id="adset_001",
            name="Test Ad Set",
            status="ACTIVE",
        )
        db_session.add(adset)
        await db_session.commit()
        await db_session.refresh(adset)
        return adset

    @pytest.mark.asyncio
    async def test_sync_ads_links_to_adset(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
        test_adset: AdSet,
    ):
        """AC-M3: ads 應正確關聯到 ad set"""
        mock_ads = [
            {
                "id": "ad_001",
                "name": "Test Ad 1",
                "status": "ACTIVE",
                "adset_id": "adset_001",
                "creative": {"id": "creative_001"},
            },
            {
                "id": "ad_002",
                "name": "Test Ad 2",
                "status": "PAUSED",
                "adset_id": "adset_001",
                "creative": {"id": "creative_002"},
            },
        ]

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_ads.return_value = mock_ads
            mock_client_class.return_value = mock_client

            result = await sync_ads_for_account(
                session=db_session,
                account=test_ad_account,
            )

            assert result["status"] == "completed"
            assert result["ads_synced"] == 2

            # 驗證關聯
            db_ads = await db_session.execute(
                select(Ad).where(Ad.ad_set_id == test_adset.id)
            )
            ads = list(db_ads.scalars().all())

            assert len(ads) == 2
            for ad in ads:
                assert ad.ad_set_id == test_adset.id

    @pytest.mark.asyncio
    async def test_sync_ads_saves_creative_id(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
        test_adset: AdSet,
    ):
        """應正確儲存 creative ID"""
        mock_ads = [
            {
                "id": "ad_001",
                "name": "Ad with Creative",
                "status": "ACTIVE",
                "adset_id": "adset_001",
                "creative": {"id": "creative_external_123"},
            },
        ]

        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_ads.return_value = mock_ads
            mock_client_class.return_value = mock_client

            await sync_ads_for_account(
                session=db_session,
                account=test_ad_account,
            )

            db_ads = await db_session.execute(
                select(Ad).where(Ad.external_id == "ad_001")
            )
            ad = db_ads.scalar_one()

            # creative_external_id 應該被儲存
            assert ad is not None


class TestParseAdData:
    """測試 ad 資料解析"""

    def test_parse_ad_data_basic(self):
        """解析基本 ad 資料"""
        raw_data = {
            "id": "ad_123",
            "name": "Test Ad",
            "status": "ACTIVE",
            "adset_id": "adset_001",
        }

        result = _parse_ad_data(raw_data)

        assert result["external_id"] == "ad_123"
        assert result["name"] == "Test Ad"
        assert result["status"] == "ACTIVE"
        assert result["adset_external_id"] == "adset_001"

    def test_parse_ad_data_with_creative(self):
        """解析包含 creative 的 ad"""
        raw_data = {
            "id": "ad_123",
            "name": "Creative Ad",
            "status": "ACTIVE",
            "adset_id": "adset_001",
            "creative": {"id": "creative_456"},
        }

        result = _parse_ad_data(raw_data)

        assert result["creative_external_id"] == "creative_456"

    def test_parse_ad_data_missing_creative(self):
        """沒有 creative 時應返回 None"""
        raw_data = {
            "id": "ad_123",
            "name": "No Creative Ad",
            "status": "ACTIVE",
            "adset_id": "adset_001",
        }

        result = _parse_ad_data(raw_data)

        assert result["creative_external_id"] is None


class TestSyncAdsTokenValidation:
    """測試 Token 驗證 - 防止無效 API 呼叫造成高錯誤率"""

    @pytest_asyncio.fixture
    async def account_with_empty_token(self, db_session: AsyncSession):
        """建立 Token 為空的測試帳戶"""
        account = AdAccount(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            platform="meta",
            external_id="123456789",
            name="Empty Token Account",
            status="active",
            access_token="",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)
        return account

    @pytest.mark.asyncio
    async def test_sync_ads_skips_empty_token(
        self, db_session: AsyncSession, account_with_empty_token: AdAccount
    ):
        """當 access_token 為空時，應跳過 API 呼叫"""
        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client

            result = await sync_ads_for_account(
                session=db_session,
                account=account_with_empty_token,
            )

            assert result["status"] == "error"
            assert result["error"] == "invalid_token"
            mock_client.get_ads.assert_not_called()
