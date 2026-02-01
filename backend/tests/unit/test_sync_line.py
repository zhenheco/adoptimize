# -*- coding: utf-8 -*-
"""LINE Ads Sync Service 測試"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.services.sync_line import LineSyncService


class TestLineSyncService:
    """測試 LINE Sync Service"""

    @pytest.fixture
    def mock_db(self):
        """模擬資料庫連線"""
        return AsyncMock()

    @pytest.fixture
    def mock_account(self):
        """模擬廣告帳號"""
        account = MagicMock()
        account.id = uuid4()
        account.external_id = "test_account_123"
        account.access_token = "test_access_key"
        account.refresh_token = "test_secret_key"
        account.user_id = uuid4()
        return account

    @pytest.fixture
    def service(self, mock_db, mock_account):
        """建立測試用 service"""
        return LineSyncService(mock_db, mock_account, use_mock=True)

    # ===========================================
    # Campaign 狀態映射測試
    # ===========================================

    def test_map_campaign_status_active(self, service):
        """ACTIVE 狀態應該映射為 active"""
        assert service._map_campaign_status("ACTIVE") == "active"

    def test_map_campaign_status_paused(self, service):
        """PAUSED 狀態應該映射為 paused"""
        assert service._map_campaign_status("PAUSED") == "paused"

    def test_map_campaign_status_ended(self, service):
        """ENDED 狀態應該映射為 removed"""
        assert service._map_campaign_status("ENDED") == "removed"

    def test_map_campaign_status_deleted(self, service):
        """DELETED 狀態應該映射為 removed"""
        assert service._map_campaign_status("DELETED") == "removed"

    def test_map_campaign_status_unknown(self, service):
        """未知狀態應該映射為 unknown"""
        assert service._map_campaign_status("SOMETHING_ELSE") == "unknown"

    # ===========================================
    # Ad Group 狀態映射測試
    # ===========================================

    def test_map_ad_group_status_active(self, service):
        """廣告組 ACTIVE 狀態應該映射為 active"""
        assert service._map_ad_group_status("ACTIVE") == "active"

    def test_map_ad_group_status_paused(self, service):
        """廣告組 PAUSED 狀態應該映射為 paused"""
        assert service._map_ad_group_status("PAUSED") == "paused"

    def test_map_ad_group_status_ended(self, service):
        """廣告組 ENDED 狀態應該映射為 removed"""
        assert service._map_ad_group_status("ENDED") == "removed"

    # ===========================================
    # Ad 狀態映射測試
    # ===========================================

    def test_map_ad_status_active(self, service):
        """廣告 ACTIVE 狀態應該映射為 active"""
        assert service._map_ad_status("ACTIVE") == "active"

    def test_map_ad_status_paused(self, service):
        """廣告 PAUSED 狀態應該映射為 paused"""
        assert service._map_ad_status("PAUSED") == "paused"

    def test_map_ad_status_in_review(self, service):
        """IN_REVIEW 狀態應該映射為 pending"""
        assert service._map_ad_status("IN_REVIEW") == "pending"

    def test_map_ad_status_rejected(self, service):
        """REJECTED 狀態應該映射為 rejected"""
        assert service._map_ad_status("REJECTED") == "rejected"

    def test_map_ad_status_ended(self, service):
        """廣告 ENDED 狀態應該映射為 removed"""
        assert service._map_ad_status("ENDED") == "removed"

    def test_map_ad_status_deleted(self, service):
        """廣告 DELETED 狀態應該映射為 removed"""
        assert service._map_ad_status("DELETED") == "removed"

    def test_map_ad_status_unknown(self, service):
        """廣告未知狀態應該映射為 unknown"""
        assert service._map_ad_status("INVALID_STATUS") == "unknown"

    # ===========================================
    # 同步功能測試
    # ===========================================

    @pytest.mark.asyncio
    async def test_sync_campaigns(self, service):
        """應該能同步廣告活動"""
        result = await service.sync_campaigns()
        assert isinstance(result, dict)
        assert "synced" in result
        assert "failed" in result
        # Mock 模式下應該有同步的資料
        assert result["synced"] >= 0
        assert result["failed"] >= 0

    @pytest.mark.asyncio
    async def test_sync_ad_groups(self, service):
        """應該能同步廣告組"""
        result = await service.sync_ad_groups()
        assert isinstance(result, dict)
        assert "synced" in result
        assert "failed" in result

    @pytest.mark.asyncio
    async def test_sync_ads(self, service):
        """應該能同步廣告"""
        result = await service.sync_ads()
        assert isinstance(result, dict)
        assert "synced" in result
        assert "failed" in result

    @pytest.mark.asyncio
    async def test_sync_all(self, service):
        """應該能同步所有 LINE Ads 數據"""
        result = await service.sync_all()
        assert isinstance(result, dict)
        assert "campaigns" in result
        assert "ad_groups" in result
        assert "ads" in result

    @pytest.mark.asyncio
    async def test_sync_campaigns_returns_correct_structure(self, service):
        """sync_campaigns 應該回傳正確的資料結構"""
        result = await service.sync_campaigns()
        # 檢查回傳的 dict 有必要的 keys
        assert set(result.keys()) >= {"synced", "failed"}
        # 確保值是整數
        assert isinstance(result["synced"], int)
        assert isinstance(result["failed"], int)

    @pytest.mark.asyncio
    async def test_sync_all_returns_nested_structure(self, service):
        """sync_all 應該回傳巢狀的資料結構"""
        result = await service.sync_all()
        # 每個子項目都應該有 synced 和 failed
        for key in ["campaigns", "ad_groups", "ads"]:
            assert key in result
            assert "synced" in result[key]
            assert "failed" in result[key]
