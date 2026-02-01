# -*- coding: utf-8 -*-
"""LinkedIn Sync Service 測試"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4


class TestLinkedInSyncService:
    """測試 LinkedIn Sync Service"""

    @pytest.fixture
    def mock_account(self):
        """模擬廣告帳戶"""
        account = MagicMock()
        account.id = uuid4()
        account.external_id = "li_account_001"
        account.access_token = "test_access_token"
        account.user_id = uuid4()
        return account

    @pytest.mark.asyncio
    async def test_service_initialization(self, mock_account):
        """測試服務初始化"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        assert service.client is not None
        assert service.client.use_mock is True

    @pytest.mark.asyncio
    async def test_campaign_status_mapping(self, mock_account):
        """測試 Campaign 狀態映射"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        assert service._map_campaign_status("ACTIVE") == "active"
        assert service._map_campaign_status("PAUSED") == "paused"
        assert service._map_campaign_status("ARCHIVED") == "removed"
        assert service._map_campaign_status("DRAFT") == "pending"
        assert service._map_campaign_status("UNKNOWN") == "unknown"

    @pytest.mark.asyncio
    async def test_creative_status_mapping(self, mock_account):
        """測試 Creative 狀態映射"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        assert service._map_creative_status("ACTIVE") == "active"
        assert service._map_creative_status("PAUSED") == "paused"
        assert service._map_creative_status("REJECTED") == "rejected"
        assert service._map_creative_status("PENDING_REVIEW") == "pending"
        assert service._map_creative_status("UNKNOWN") == "unknown"

    @pytest.mark.asyncio
    async def test_can_fetch_campaigns_from_client(self, mock_account):
        """測試可以從 API Client 取得 campaigns"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        campaigns = await service.client.get_campaigns("li_account_001")
        assert len(campaigns) > 0

    @pytest.mark.asyncio
    async def test_campaign_group_status_mapping(self, mock_account):
        """測試 Campaign Group 狀態映射"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        assert service._map_campaign_group_status("ACTIVE") == "active"
        assert service._map_campaign_group_status("ARCHIVED") == "removed"
        assert service._map_campaign_group_status("DRAFT") == "pending"
        assert service._map_campaign_group_status("UNKNOWN") == "unknown"

    @pytest.mark.asyncio
    async def test_can_fetch_creatives_from_client(self, mock_account):
        """測試可以從 API Client 取得 creatives"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        creatives = await service.client.get_creatives("li_account_001")
        assert len(creatives) > 0

    @pytest.mark.asyncio
    async def test_can_fetch_campaign_groups_from_client(self, mock_account):
        """測試可以從 API Client 取得 campaign groups"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        groups = await service.client.get_campaign_groups("li_account_001")
        assert len(groups) > 0

    @pytest.mark.asyncio
    async def test_campaign_status_canceled_maps_to_removed(self, mock_account):
        """測試 CANCELED 狀態映射到 removed"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        assert service._map_campaign_status("CANCELED") == "removed"

    @pytest.mark.asyncio
    async def test_creative_status_archived_maps_to_removed(self, mock_account):
        """測試 Creative ARCHIVED 狀態映射到 removed"""
        from app.services.sync_linkedin import LinkedInSyncService

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        assert service._map_creative_status("ARCHIVED") == "removed"
