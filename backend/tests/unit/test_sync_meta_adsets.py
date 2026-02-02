# -*- coding: utf-8 -*-
"""
Meta Ad Sets 同步測試

測試驗收標準：
- AC-M2: sync_adsets() 能同步 ad sets 並關聯到正確的 campaign
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
from app.workers.sync_meta import (
    sync_adsets_for_account,
    _parse_adset_data,
)


class TestSyncAdSets:
    """測試 ad sets 同步功能"""

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
            objective="CONVERSIONS",
        )
        db_session.add(campaign)
        await db_session.commit()
        await db_session.refresh(campaign)
        return campaign

    @pytest.mark.asyncio
    async def test_sync_adsets_links_to_campaign(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
        test_campaign: Campaign,
    ):
        """AC-M2: ad sets 應正確關聯到 campaign"""
        mock_adsets = [
            {
                "id": "adset_001",
                "name": "Test Ad Set 1",
                "status": "ACTIVE",
                "campaign_id": "camp_001",  # 對應 test_campaign.external_id
                "targeting": {"age_min": 18, "age_max": 65},
                "daily_budget": "5000",
            },
            {
                "id": "adset_002",
                "name": "Test Ad Set 2",
                "status": "PAUSED",
                "campaign_id": "camp_001",
                "targeting": {"age_min": 25, "age_max": 45},
                "daily_budget": "3000",
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

            # 驗證回傳結果
            assert result["status"] == "completed"
            assert result["adsets_synced"] == 2

            # 驗證資料庫
            db_adsets = await db_session.execute(
                select(AdSet).where(AdSet.campaign_id == test_campaign.id)
            )
            adsets = list(db_adsets.scalars().all())

            assert len(adsets) == 2

            # 驗證關聯正確
            for adset in adsets:
                assert adset.campaign_id == test_campaign.id

    @pytest.mark.asyncio
    async def test_sync_adsets_saves_targeting(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
        test_campaign: Campaign,
    ):
        """應正確儲存 targeting 資料"""
        mock_adsets = [
            {
                "id": "adset_001",
                "name": "Targeted Ad Set",
                "status": "ACTIVE",
                "campaign_id": "camp_001",
                "targeting": {
                    "age_min": 18,
                    "age_max": 65,
                    "genders": [1, 2],
                    "geo_locations": {
                        "countries": ["TW", "US"]
                    },
                    "interests": [
                        {"id": "123", "name": "Technology"}
                    ]
                },
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

            # 驗證 targeting 資料
            db_adsets = await db_session.execute(
                select(AdSet).where(AdSet.external_id == "adset_001")
            )
            adset = db_adsets.scalar_one()

            assert adset.targeting is not None
            assert adset.targeting["age_min"] == 18
            assert adset.targeting["age_max"] == 65
            assert "interests" in adset.targeting

    @pytest.mark.asyncio
    async def test_sync_adsets_unmatched_campaign_skipped(
        self,
        db_session: AsyncSession,
        test_ad_account: AdAccount,
    ):
        """campaign 不存在時應跳過該 ad set"""
        mock_adsets = [
            {
                "id": "adset_orphan",
                "name": "Orphan Ad Set",
                "status": "ACTIVE",
                "campaign_id": "camp_nonexistent",  # 不存在的 campaign
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

            # 應該跳過，synced 為 0
            assert result["adsets_synced"] == 0
            assert result.get("skipped", 0) >= 1


class TestParseAdSetData:
    """測試 ad set 資料解析"""

    def test_parse_adset_data_basic(self):
        """解析基本 ad set 資料"""
        raw_data = {
            "id": "adset_123",
            "name": "Test Ad Set",
            "status": "ACTIVE",
            "campaign_id": "camp_001",
            "daily_budget": "5000",
        }

        result = _parse_adset_data(raw_data)

        assert result["external_id"] == "adset_123"
        assert result["name"] == "Test Ad Set"
        assert result["status"] == "ACTIVE"
        assert result["campaign_external_id"] == "camp_001"
        assert result["budget_type"] == "DAILY"
        assert result["budget_amount"] == Decimal("50.00")

    def test_parse_adset_data_with_targeting(self):
        """解析包含 targeting 的 ad set"""
        raw_data = {
            "id": "adset_123",
            "name": "Targeted Set",
            "status": "ACTIVE",
            "campaign_id": "camp_001",
            "targeting": {
                "age_min": 25,
                "age_max": 45,
                "genders": [1],
            },
        }

        result = _parse_adset_data(raw_data)

        assert result["targeting"] is not None
        assert result["targeting"]["age_min"] == 25

    def test_parse_adset_data_with_bid_strategy(self):
        """解析包含 bid strategy 的 ad set"""
        raw_data = {
            "id": "adset_123",
            "name": "Bid Strategy Set",
            "status": "ACTIVE",
            "campaign_id": "camp_001",
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
            "optimization_goal": "CONVERSIONS",
        }

        result = _parse_adset_data(raw_data)

        assert result["bid_strategy"] == "LOWEST_COST_WITHOUT_CAP"


class TestSyncAdSetsTokenValidation:
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
    async def test_sync_adsets_skips_empty_token(
        self, db_session: AsyncSession, account_with_empty_token: AdAccount
    ):
        """當 access_token 為空時，應跳過 API 呼叫"""
        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client

            result = await sync_adsets_for_account(
                session=db_session,
                account=account_with_empty_token,
            )

            assert result["status"] == "error"
            assert result["error"] == "invalid_token"
            mock_client.get_adsets.assert_not_called()
