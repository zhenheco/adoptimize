# -*- coding: utf-8 -*-
"""Reddit 數據同步服務單元測試"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4


class TestSyncRedditStatusMapping:
    """測試狀態映射"""

    def test_map_campaign_status_active(self):
        """ACTIVE 應映射為 active"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("ACTIVE") == "active"

    def test_map_campaign_status_paused(self):
        """PAUSED 應映射為 paused"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("PAUSED") == "paused"

    def test_map_campaign_status_completed(self):
        """COMPLETED 應映射為 removed"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("COMPLETED") == "removed"

    def test_map_campaign_status_unknown(self):
        """未知狀態應映射為 unknown"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("SOMETHING_ELSE") == "unknown"

    def test_map_ad_group_status_active(self):
        """廣告組 ACTIVE 應映射為 active"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_ad_group_status("ACTIVE") == "active"

    def test_map_ad_status_pending_review(self):
        """廣告 PENDING_REVIEW 應映射為 pending"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_ad_status("PENDING_REVIEW") == "pending"


class TestSyncRedditCampaigns:
    """測試廣告活動同步"""

    @pytest.mark.asyncio
    async def test_sync_campaigns_returns_list(self):
        """sync_campaigns 應返回同步的廣告活動列表"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.access_token = "test_token"
        mock_account.external_id = "test_account"

        service = SyncRedditService(mock_db)

        with patch.object(service, "_get_account", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_account

            with patch("app.services.sync_reddit.RedditAPIClient") as MockClient:
                mock_client = AsyncMock()
                mock_client.get_campaigns.return_value = [
                    {"id": "camp_1", "name": "Test Campaign", "status": "ACTIVE"}
                ]
                MockClient.return_value = mock_client

                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = None
                mock_db.execute.return_value = mock_result

                campaigns = await service.sync_campaigns(mock_account.id)

                assert isinstance(campaigns, list)


class TestSyncRedditAll:
    """測試完整同步"""

    @pytest.mark.asyncio
    async def test_sync_all_returns_stats(self):
        """sync_all 應返回同步統計"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        service = SyncRedditService(mock_db)

        with patch.object(service, "sync_campaigns", new_callable=AsyncMock) as mock_camps:
            mock_camps.return_value = [MagicMock(), MagicMock()]

            with patch.object(service, "sync_ad_sets", new_callable=AsyncMock) as mock_sets:
                mock_sets.return_value = [MagicMock()]

                with patch.object(service, "sync_ads", new_callable=AsyncMock) as mock_ads:
                    mock_ads.return_value = [MagicMock(), MagicMock(), MagicMock()]

                    with patch.object(service, "_get_account", new_callable=AsyncMock) as mock_get:
                        mock_get.return_value = MagicMock()

                        result = await service.sync_all(uuid4())

                        assert "campaigns" in result
                        assert "ad_sets" in result
                        assert "ads" in result
                        assert result["campaigns"] == 2
                        assert result["ad_sets"] == 1
                        assert result["ads"] == 3
