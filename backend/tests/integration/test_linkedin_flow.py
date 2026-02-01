# -*- coding: utf-8 -*-
"""LinkedIn Ads 整合流程測試"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4


class TestLinkedInIntegrationFlow:
    """測試 LinkedIn Ads 完整整合流程"""

    @pytest.fixture
    def mock_user(self):
        """模擬已登入用戶"""
        user = MagicMock()
        user.id = uuid4()
        user.email = "test@example.com"
        return user

    @pytest.fixture
    def mock_settings(self):
        """模擬設定"""
        settings = MagicMock()
        settings.LINKEDIN_CLIENT_ID = "test_client_id"
        settings.LINKEDIN_CLIENT_SECRET = "test_client_secret"
        return settings

    @pytest.mark.asyncio
    async def test_oauth_auth_url_generation(self, mock_user, mock_settings):
        """測試 OAuth 授權 URL 產生"""
        from app.routers.oauth_linkedin import get_auth_url

        with patch("app.routers.oauth_linkedin.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state_123"

            result = await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert "linkedin.com/oauth/v2/authorization" in result.auth_url
            assert "client_id=test_client_id" in result.auth_url
            assert result.state == "test_state_123"

    @pytest.mark.asyncio
    async def test_token_exchange_mock_mode(self, mock_settings):
        """測試 Token 交換（Mock 模式）"""
        from app.routers.oauth_linkedin import exchange_code_for_tokens

        with patch("app.routers.oauth_linkedin.is_mock_mode", return_value=True):
            tokens = await exchange_code_for_tokens(
                code="test_code",
                redirect_uri="http://localhost:3000/callback",
                settings=mock_settings,
            )

            assert tokens["access_token"].startswith("mock_linkedin_access_")
            assert tokens["expires_in"] == 5184000  # 60 天

    @pytest.mark.asyncio
    async def test_api_client_mock_flow(self):
        """測試 API Client Mock 流程"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(
            access_token="test_token",
            use_mock=True,
        )

        # 測試所有 API 方法
        accounts = await client.get_ad_accounts()
        campaigns = await client.get_campaigns("test_account")
        groups = await client.get_campaign_groups("test_account")
        creatives = await client.get_creatives("test_account")
        metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")

        assert len(accounts) > 0
        assert len(campaigns) > 0
        assert len(groups) > 0
        assert len(creatives) > 0
        assert len(metrics) > 0

    @pytest.mark.asyncio
    async def test_sync_service_initialization(self):
        """測試同步服務初始化"""
        from app.services.sync_linkedin import LinkedInSyncService

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.external_id = "li_account_001"
        mock_account.access_token = "test_token"
        mock_account.user_id = uuid4()

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        assert service.client is not None
        assert service.client.use_mock is True

        # 測試可以從 client 取得數據
        campaigns = await service.client.get_campaigns("test")
        assert len(campaigns) > 0

    @pytest.mark.asyncio
    async def test_status_mapping_comprehensive(self):
        """測試完整狀態映射"""
        from app.services.sync_linkedin import LinkedInSyncService

        mock_account = MagicMock()
        mock_account.access_token = "test"
        mock_account.external_id = "test"

        service = LinkedInSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        # Campaign 狀態映射
        assert service._map_campaign_status("ACTIVE") == "active"
        assert service._map_campaign_status("PAUSED") == "paused"
        assert service._map_campaign_status("ARCHIVED") == "removed"
        assert service._map_campaign_status("DRAFT") == "pending"
        assert service._map_campaign_status("UNKNOWN") == "unknown"

        # Creative 狀態映射
        assert service._map_creative_status("ACTIVE") == "active"
        assert service._map_creative_status("PAUSED") == "paused"
        assert service._map_creative_status("REJECTED") == "rejected"
        assert service._map_creative_status("PENDING_REVIEW") == "pending"

    @pytest.mark.asyncio
    async def test_api_client_headers(self):
        """測試 API Client 必要 Headers"""
        from app.services.linkedin_api_client import LinkedInAPIClient

        client = LinkedInAPIClient(
            access_token="test_token",
            use_mock=True,
        )

        headers = client._get_headers()

        assert headers["Authorization"] == "Bearer test_token"
        assert headers["X-Restli-Protocol-Version"] == "2.0.0"
        assert "Linkedin-Version" in headers
        assert headers["Content-Type"] == "application/json"
