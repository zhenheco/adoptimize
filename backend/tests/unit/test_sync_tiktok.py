# -*- coding: utf-8 -*-
"""TikTok 數據同步服務測試

測試重點：
1. 狀態映射邏輯
2. 同步服務的數據處理流程（使用 mock）
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone


class TestSyncTikTokStatusMapping:
    """測試狀態映射 - 這是純邏輯測試，不需要數據庫"""

    def test_map_campaign_status_enable(self):
        """CAMPAIGN_STATUS_ENABLE 應映射為 active"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_campaign_status("CAMPAIGN_STATUS_ENABLE") == "active"

    def test_map_campaign_status_disable(self):
        """CAMPAIGN_STATUS_DISABLE 應映射為 paused"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_campaign_status("CAMPAIGN_STATUS_DISABLE") == "paused"

    def test_map_campaign_status_delete(self):
        """CAMPAIGN_STATUS_DELETE 應映射為 removed"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_campaign_status("CAMPAIGN_STATUS_DELETE") == "removed"

    def test_map_campaign_status_unknown(self):
        """未知狀態應映射為 unknown"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_campaign_status("SOME_UNKNOWN_STATUS") == "unknown"

    def test_map_adgroup_status_delivery_ok(self):
        """ADGROUP_STATUS_DELIVERY_OK 應映射為 active"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_adgroup_status("ADGROUP_STATUS_DELIVERY_OK") == "active"

    def test_map_adgroup_status_not_deliver(self):
        """ADGROUP_STATUS_NOT_DELIVER 應映射為 paused"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_adgroup_status("ADGROUP_STATUS_NOT_DELIVER") == "paused"

    def test_map_ad_status_delivery_ok(self):
        """AD_STATUS_DELIVERY_OK 應映射為 active"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_ad_status("AD_STATUS_DELIVERY_OK") == "active"

    def test_map_ad_status_not_deliver(self):
        """AD_STATUS_NOT_DELIVER 應映射為 paused"""
        from app.services.sync_tiktok import SyncTikTokService

        service = SyncTikTokService(None)  # type: ignore
        assert service._map_ad_status("AD_STATUS_NOT_DELIVER") == "paused"


class TestSyncTikTokCampaignsWithMock:
    """測試同步廣告活動（使用完全 mock 的方式）"""

    @pytest.mark.asyncio
    async def test_sync_campaigns_returns_empty_when_account_not_found(self):
        """帳戶不存在時應返回空列表"""
        from app.services.sync_tiktok import SyncTikTokService

        # 完全 mock db session
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        service = SyncTikTokService(mock_db)
        result = await service.sync_campaigns(uuid4())

        assert result == []

    @pytest.mark.asyncio
    async def test_sync_campaigns_creates_new_campaign(self):
        """應該創建新的廣告活動"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount
        from app.models.campaign import Campaign

        # 建立 mock account
        mock_account = MagicMock(spec=AdAccount)
        mock_account.id = uuid4()
        mock_account.external_id = "adv_123"
        mock_account.access_token = "test_token"

        # 設置 mock db session
        mock_db = AsyncMock()

        # 第一次查詢返回 account
        # 第二次查詢返回 None（campaign 不存在）
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = mock_account
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None

        mock_db.execute.side_effect = [mock_result1, mock_result2]

        # Mock TikTok API Client
        mock_campaigns = [
            {
                "id": "camp_001",
                "name": "Campaign 1",
                "status": "CAMPAIGN_STATUS_ENABLE",
            }
        ]

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_campaigns.return_value = mock_campaigns
            MockClient.return_value = mock_instance

            service = SyncTikTokService(mock_db)
            result = await service.sync_campaigns(mock_account.id)

            # 驗證呼叫了 API
            mock_instance.get_campaigns.assert_called_once_with("adv_123")

            # 驗證嘗試添加新 campaign
            assert mock_db.add.called

    @pytest.mark.asyncio
    async def test_sync_campaigns_updates_existing_campaign(self):
        """應該更新已存在的廣告活動"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount
        from app.models.campaign import Campaign

        # 建立 mock account
        mock_account = MagicMock(spec=AdAccount)
        mock_account.id = uuid4()
        mock_account.external_id = "adv_123"
        mock_account.access_token = "test_token"

        # 建立 mock existing campaign
        mock_existing_campaign = MagicMock(spec=Campaign)
        mock_existing_campaign.external_id = "camp_001"
        mock_existing_campaign.name = "Old Name"
        mock_existing_campaign.status = "paused"

        # 設置 mock db session
        mock_db = AsyncMock()

        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = mock_account
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = mock_existing_campaign

        mock_db.execute.side_effect = [mock_result1, mock_result2]

        # Mock TikTok API Client
        mock_campaigns = [
            {
                "id": "camp_001",
                "name": "Updated Name",
                "status": "CAMPAIGN_STATUS_ENABLE",
            }
        ]

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_campaigns.return_value = mock_campaigns
            MockClient.return_value = mock_instance

            service = SyncTikTokService(mock_db)
            result = await service.sync_campaigns(mock_account.id)

            # 驗證更新了 campaign
            assert mock_existing_campaign.name == "Updated Name"
            assert mock_existing_campaign.status == "active"


class TestSyncTikTokAdSetsWithMock:
    """測試同步廣告組（使用完全 mock 的方式）"""

    @pytest.mark.asyncio
    async def test_sync_ad_sets_skips_orphan_campaign(self):
        """找不到對應 campaign 時應跳過"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount

        # 建立 mock account
        mock_account = MagicMock(spec=AdAccount)
        mock_account.id = uuid4()
        mock_account.external_id = "adv_123"
        mock_account.access_token = "test_token"

        # 設置 mock db session
        mock_db = AsyncMock()

        # 第一次查詢返回 account
        # 第二次查詢返回 None（campaign 不存在）
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = mock_account
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None

        mock_db.execute.side_effect = [mock_result1, mock_result2]

        # Mock TikTok API Client
        mock_adgroups = [
            {
                "id": "adgroup_001",
                "name": "AdGroup 1",
                "campaign_id": "non_existent_camp",
                "status": "ADGROUP_STATUS_DELIVERY_OK",
            }
        ]

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_adgroups.return_value = mock_adgroups
            MockClient.return_value = mock_instance

            service = SyncTikTokService(mock_db)
            result = await service.sync_ad_sets(mock_account.id)

            # 因為找不到 campaign，所以結果為空
            assert result == []


class TestSyncTikTokAdsWithMock:
    """測試同步廣告（使用完全 mock 的方式）"""

    @pytest.mark.asyncio
    async def test_sync_ads_skips_orphan_adset(self):
        """找不到對應 ad_set 時應跳過"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount

        # 建立 mock account
        mock_account = MagicMock(spec=AdAccount)
        mock_account.id = uuid4()
        mock_account.external_id = "adv_123"
        mock_account.access_token = "test_token"

        # 設置 mock db session
        mock_db = AsyncMock()

        # 第一次查詢返回 account
        # 第二次查詢返回 None（ad_set 不存在）
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = mock_account
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None

        mock_db.execute.side_effect = [mock_result1, mock_result2]

        # Mock TikTok API Client
        mock_ads = [
            {
                "id": "ad_001",
                "name": "Ad 1",
                "adgroup_id": "non_existent_adgroup",
                "status": "AD_STATUS_DELIVERY_OK",
            }
        ]

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_ads.return_value = mock_ads
            MockClient.return_value = mock_instance

            service = SyncTikTokService(mock_db)
            result = await service.sync_ads(mock_account.id)

            # 因為找不到 ad_set，所以結果為空
            assert result == []


class TestSyncTikTokAllWithMock:
    """測試全量同步（使用完全 mock 的方式）"""

    @pytest.mark.asyncio
    async def test_sync_all_returns_statistics(self):
        """sync_all 應返回統計結果"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount

        # 建立 mock account
        mock_account = MagicMock(spec=AdAccount)
        mock_account.id = uuid4()
        mock_account.external_id = "adv_123"
        mock_account.access_token = "test_token"
        mock_account.last_sync_at = None

        # 設置 mock db session
        mock_db = AsyncMock()

        def execute_side_effect(query):
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_account
            return mock_result

        mock_db.execute.side_effect = execute_side_effect

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_campaigns.return_value = []
            mock_instance.get_adgroups.return_value = []
            mock_instance.get_ads.return_value = []
            MockClient.return_value = mock_instance

            service = SyncTikTokService(mock_db)
            result = await service.sync_all(mock_account.id)

            assert "campaigns" in result
            assert "ad_sets" in result
            assert "ads" in result
            assert result["campaigns"] == 0
            assert result["ad_sets"] == 0
            assert result["ads"] == 0

    @pytest.mark.asyncio
    async def test_sync_all_updates_last_sync_at(self):
        """sync_all 應更新 last_sync_at"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount

        # 建立 mock account
        mock_account = MagicMock(spec=AdAccount)
        mock_account.id = uuid4()
        mock_account.external_id = "adv_123"
        mock_account.access_token = "test_token"
        mock_account.last_sync_at = None

        # 設置 mock db session
        mock_db = AsyncMock()

        def execute_side_effect(query):
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_account
            return mock_result

        mock_db.execute.side_effect = execute_side_effect

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_campaigns.return_value = []
            mock_instance.get_adgroups.return_value = []
            mock_instance.get_ads.return_value = []
            MockClient.return_value = mock_instance

            service = SyncTikTokService(mock_db)
            await service.sync_all(mock_account.id)

            # 驗證 last_sync_at 被更新了
            assert mock_account.last_sync_at is not None
            mock_db.commit.assert_called()
