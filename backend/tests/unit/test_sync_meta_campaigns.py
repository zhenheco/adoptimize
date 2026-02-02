# -*- coding: utf-8 -*-
"""
Meta Campaigns 同步測試

測試驗收標準：
- AC-M1: sync_campaigns() 能從 Meta API 取得 campaigns 並存入 DB
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.workers.sync_meta import (
    sync_campaigns_for_account,
    _parse_campaign_data,
)


class TestSyncCampaigns:
    """測試 campaigns 同步功能"""

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
    async def test_sync_campaigns_saves_to_db(
        self, db_session: AsyncSession, test_ad_account: AdAccount
    ):
        """AC-M1: 應將 campaigns 存入資料庫"""
        mock_campaigns = [
            {
                "id": "camp_001",
                "name": "Test Campaign 1",
                "status": "ACTIVE",
                "objective": "CONVERSIONS",
                "daily_budget": "10000",
            },
            {
                "id": "camp_002",
                "name": "Test Campaign 2",
                "status": "PAUSED",
                "objective": "TRAFFIC",
                "daily_budget": "5000",
            },
        ]

        with patch(
            "app.workers.sync_meta.MetaAPIClient"
        ) as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_campaigns.return_value = mock_campaigns
            mock_client_class.return_value = mock_client

            result = await sync_campaigns_for_account(
                session=db_session,
                account=test_ad_account,
            )

            # 驗證回傳結果
            assert result["status"] == "completed"
            assert result["campaigns_synced"] == 2

            # 驗證資料庫
            db_campaigns = await db_session.execute(
                select(Campaign).where(Campaign.account_id == test_ad_account.id)
            )
            campaigns = list(db_campaigns.scalars().all())

            assert len(campaigns) == 2

            # 驗證第一筆資料
            camp1 = next(c for c in campaigns if c.external_id == "camp_001")
            assert camp1.name == "Test Campaign 1"
            assert camp1.status == "ACTIVE"
            assert camp1.objective == "CONVERSIONS"

    @pytest.mark.asyncio
    async def test_sync_campaigns_updates_existing(
        self, db_session: AsyncSession, test_ad_account: AdAccount
    ):
        """應更新已存在的 campaign 而非建立重複資料"""
        # 先建立一筆既有的 campaign
        existing_campaign = Campaign(
            id=uuid.uuid4(),
            account_id=test_ad_account.id,
            external_id="camp_001",
            name="Old Name",
            status="PAUSED",
            objective="TRAFFIC",
        )
        db_session.add(existing_campaign)
        await db_session.commit()

        # 模擬 API 回傳更新後的資料
        mock_campaigns = [
            {
                "id": "camp_001",
                "name": "Updated Name",
                "status": "ACTIVE",
                "objective": "CONVERSIONS",
                "daily_budget": "10000",
            },
        ]

        with patch(
            "app.workers.sync_meta.MetaAPIClient"
        ) as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_campaigns.return_value = mock_campaigns
            mock_client_class.return_value = mock_client

            result = await sync_campaigns_for_account(
                session=db_session,
                account=test_ad_account,
            )

            # 驗證沒有重複
            db_campaigns = await db_session.execute(
                select(Campaign).where(
                    Campaign.account_id == test_ad_account.id,
                    Campaign.external_id == "camp_001",
                )
            )
            campaigns = list(db_campaigns.scalars().all())

            assert len(campaigns) == 1
            assert campaigns[0].name == "Updated Name"
            assert campaigns[0].status == "ACTIVE"

    @pytest.mark.asyncio
    async def test_sync_campaigns_handles_pagination(
        self, db_session: AsyncSession, test_ad_account: AdAccount
    ):
        """AC-M1: 應正確處理分頁取得所有 campaigns"""
        # MetaAPIClient 內部已處理分頁，這裡只需驗證能處理大量資料
        mock_campaigns = [
            {"id": f"camp_{i:03d}", "name": f"Campaign {i}", "status": "ACTIVE"}
            for i in range(150)  # 超過一般單頁限制
        ]

        with patch(
            "app.workers.sync_meta.MetaAPIClient"
        ) as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get_campaigns.return_value = mock_campaigns
            mock_client_class.return_value = mock_client

            result = await sync_campaigns_for_account(
                session=db_session,
                account=test_ad_account,
            )

            assert result["campaigns_synced"] == 150

            # 驗證全部存入
            db_campaigns = await db_session.execute(
                select(Campaign).where(Campaign.account_id == test_ad_account.id)
            )
            campaigns = list(db_campaigns.scalars().all())
            assert len(campaigns) == 150


class TestParseCampaignData:
    """測試 campaign 資料解析"""

    def test_parse_campaign_data_basic(self):
        """解析基本 campaign 資料"""
        raw_data = {
            "id": "123456",
            "name": "Test Campaign",
            "status": "ACTIVE",
            "objective": "CONVERSIONS",
            "daily_budget": "10000",
        }

        result = _parse_campaign_data(raw_data)

        assert result["external_id"] == "123456"
        assert result["name"] == "Test Campaign"
        assert result["status"] == "ACTIVE"
        assert result["objective"] == "CONVERSIONS"
        assert result["budget_type"] == "DAILY"
        assert result["budget_amount"] == Decimal("100.00")  # 10000 / 100

    def test_parse_campaign_data_lifetime_budget(self):
        """解析 lifetime budget"""
        raw_data = {
            "id": "123456",
            "name": "Lifetime Campaign",
            "status": "ACTIVE",
            "lifetime_budget": "500000",
        }

        result = _parse_campaign_data(raw_data)

        assert result["budget_type"] == "LIFETIME"
        assert result["budget_amount"] == Decimal("5000.00")

    def test_parse_campaign_data_with_dates(self):
        """解析包含日期的 campaign"""
        raw_data = {
            "id": "123456",
            "name": "Dated Campaign",
            "status": "ACTIVE",
            "start_time": "2024-01-01T00:00:00+0000",
            "stop_time": "2024-12-31T23:59:59+0000",
        }

        result = _parse_campaign_data(raw_data)

        assert result["start_date"] is not None
        assert result["end_date"] is not None

    def test_parse_campaign_data_missing_optional_fields(self):
        """缺少可選欄位時不應報錯"""
        raw_data = {
            "id": "123456",
            "name": "Minimal Campaign",
        }

        result = _parse_campaign_data(raw_data)

        assert result["external_id"] == "123456"
        assert result["name"] == "Minimal Campaign"
        assert result["budget_type"] is None
        assert result["budget_amount"] is None


class TestSyncCampaignsTokenValidation:
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
            access_token="",  # 空 Token
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)
        return account

    @pytest_asyncio.fixture
    async def account_with_none_token(self, db_session: AsyncSession):
        """建立 Token 為 None 的測試帳戶"""
        account = AdAccount(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            platform="meta",
            external_id="987654321",
            name="None Token Account",
            status="active",
            access_token=None,  # None Token
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)
        return account

    @pytest.mark.asyncio
    async def test_sync_campaigns_skips_empty_token(
        self, db_session: AsyncSession, account_with_empty_token: AdAccount
    ):
        """
        當 access_token 為空字串時，應直接返回 invalid_token 錯誤，不呼叫 API

        這是防止 Meta App Review 被拒絕的關鍵測試：
        - 不應該發送無效的 API 請求
        - 應該返回明確的錯誤狀態
        """
        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client

            result = await sync_campaigns_for_account(
                session=db_session,
                account=account_with_empty_token,
            )

            # 驗證返回錯誤狀態
            assert result["status"] == "error"
            assert result["error"] == "invalid_token"

            # 關鍵：驗證 API 沒有被呼叫
            mock_client.get_campaigns.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_campaigns_skips_none_token(
        self, db_session: AsyncSession, account_with_none_token: AdAccount
    ):
        """
        當 access_token 為 None 時，應直接返回 invalid_token 錯誤，不呼叫 API
        """
        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client

            result = await sync_campaigns_for_account(
                session=db_session,
                account=account_with_none_token,
            )

            # 驗證返回錯誤狀態
            assert result["status"] == "error"
            assert result["error"] == "invalid_token"

            # 關鍵：驗證 API 沒有被呼叫
            mock_client.get_campaigns.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_campaigns_marks_account_status_when_invalid_token(
        self, db_session: AsyncSession, account_with_empty_token: AdAccount
    ):
        """
        當偵測到無效 Token 時，應將帳戶狀態標記為 token_invalid
        """
        with patch("app.workers.sync_meta.MetaAPIClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value = mock_client

            await sync_campaigns_for_account(
                session=db_session,
                account=account_with_empty_token,
            )

            # 重新查詢帳戶狀態
            await db_session.refresh(account_with_empty_token)
            assert account_with_empty_token.status == "token_invalid"
