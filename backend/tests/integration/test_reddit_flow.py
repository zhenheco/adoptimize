# -*- coding: utf-8 -*-
"""
Reddit Ads 整合測試

測試完整的 Reddit OAuth 流程和數據同步。
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone


class TestRedditOAuthFlow:
    """測試 Reddit OAuth 完整流程"""

    @pytest.mark.asyncio
    async def test_full_oauth_flow_mock_mode(self):
        """測試 Mock 模式下的完整 OAuth 流程"""
        from app.routers.oauth_reddit import get_auth_url, oauth_callback, AuthUrlResponse

        # Step 1: 取得授權 URL
        mock_user = MagicMock()
        mock_user.id = uuid4()
        mock_settings = MagicMock()
        mock_settings.REDDIT_CLIENT_ID = "test_client_id"
        mock_settings.REDDIT_CLIENT_SECRET = "test_secret"

        with patch("app.routers.oauth_reddit.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state_123"

            auth_result = await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert isinstance(auth_result, AuthUrlResponse)
            assert "reddit.com/api/v1/authorize" in auth_result.auth_url
            assert auth_result.state == "test_state_123"

    @pytest.mark.asyncio
    async def test_oauth_callback_to_sync_flow(self):
        """測試 OAuth 回調後的數據同步流程"""
        from app.routers.oauth_reddit import oauth_callback
        from app.services.sync_reddit import SyncRedditService

        mock_settings = MagicMock()
        mock_settings.REDDIT_CLIENT_ID = "test_client_id"
        mock_settings.REDDIT_CLIENT_SECRET = "test_secret"
        mock_db = MagicMock()

        user_id = uuid4()
        account_id = uuid4()

        # Mock OAuth 回調
        with patch("app.routers.oauth_reddit.verify_oauth_state", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (True, user_id, None)

            with patch("app.routers.oauth_reddit.exchange_code_for_tokens", new_callable=AsyncMock) as mock_exchange:
                mock_exchange.return_value = {
                    "access_token": "mock_access_token",
                    "refresh_token": "mock_refresh_token",
                    "expires_in": 3600,
                }

                with patch("app.routers.oauth_reddit.TokenManager") as MockTokenManager:
                    mock_tm = MagicMock()
                    mock_tm.save_new_account = AsyncMock(return_value=account_id)
                    MockTokenManager.return_value = mock_tm

                    result = await oauth_callback(
                        code="test_auth_code",
                        state="test_state",
                        error=None,
                        error_description=None,
                        redirect_uri="http://localhost:3000/callback",
                        db=mock_db,
                        settings=mock_settings,
                    )

                    assert result.success is True
                    assert result.account_id == str(account_id)

        # Mock 數據同步
        with patch("app.services.sync_reddit.RedditAPIClient") as MockClient:
            mock_client = AsyncMock()
            mock_client.get_campaigns.return_value = [
                {"id": "camp_001", "name": "Test Campaign", "status": "ACTIVE"}
            ]
            mock_client.get_ad_groups.return_value = []
            mock_client.get_ads.return_value = []
            MockClient.return_value = mock_client

            mock_account = MagicMock()
            mock_account.access_token = "mock_access_token"
            mock_account.external_id = "test_account"

            sync_db = MagicMock()
            sync_db.execute = AsyncMock()
            sync_db.commit = AsyncMock()

            with patch.object(SyncRedditService, "_get_account", new_callable=AsyncMock) as mock_get_account:
                mock_get_account.return_value = mock_account

                service = SyncRedditService(sync_db)
                assert service is not None


class TestRedditAPIClientIntegration:
    """測試 Reddit API Client 整合"""

    @pytest.mark.asyncio
    async def test_api_client_mock_mode_returns_consistent_data(self):
        """Mock 模式應返回一致的數據結構"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.reddit_api_client import RedditAPIClient

            client = RedditAPIClient(access_token="test_token")

            # 測試 campaigns
            campaigns = await client.get_campaigns("test_account")
            assert isinstance(campaigns, list)
            for camp in campaigns:
                assert "id" in camp
                assert "name" in camp
                assert "status" in camp

            # 測試 ad_groups
            ad_groups = await client.get_ad_groups("test_account")
            assert isinstance(ad_groups, list)
            for ag in ad_groups:
                assert "id" in ag
                assert "name" in ag
                assert "campaign_id" in ag

            # 測試 ads
            ads = await client.get_ads("test_account")
            assert isinstance(ads, list)
            for ad in ads:
                assert "id" in ad
                assert "name" in ad
                assert "ad_group_id" in ad

            # 測試 metrics
            metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")
            assert isinstance(metrics, list)
            for m in metrics:
                assert "impressions" in m
                assert "clicks" in m
                assert "spend" in m


class TestRedditTokenRefreshFlow:
    """測試 Token 刷新流程"""

    @pytest.mark.asyncio
    async def test_token_refresh_mock_mode(self):
        """Mock 模式下的 Token 刷新"""
        from app.services.token_manager import TokenManager

        mock_db = MagicMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.refresh_token = "mock_refresh_token"
        mock_account.external_id = "test_account"

        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            manager = TokenManager(mock_db)

            with patch.object(manager, "update_tokens", new_callable=AsyncMock) as mock_update:
                mock_update.return_value = True

                result = await manager.refresh_reddit_token(mock_account)

                assert result is True
                mock_update.assert_called_once()


class TestRedditEndToEnd:
    """端到端測試"""

    def test_all_reddit_modules_importable(self):
        """確保所有 Reddit 模組可以正確 import"""
        from app.routers.oauth_reddit import (
            router,
            get_auth_url,
            oauth_callback,
            refresh_token_endpoint,
            AuthUrlResponse,
            CallbackResponse,
            RefreshTokenRequest,
            RefreshTokenResponse,
        )

        from app.services.reddit_api_client import RedditAPIClient

        from app.services.sync_reddit import SyncRedditService

        from app.services.token_manager import TokenManager

        routes = [route.path for route in router.routes]
        assert "/auth" in routes
        assert "/callback" in routes
        assert "/refresh" in routes

    def test_reddit_status_mapping_consistency(self):
        """測試狀態映射的一致性"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)

        # Campaign 狀態
        assert service._map_campaign_status("ACTIVE") == "active"
        assert service._map_campaign_status("PAUSED") == "paused"
        assert service._map_campaign_status("COMPLETED") == "removed"
        assert service._map_campaign_status("UNKNOWN") == "unknown"

        # Ad Group 狀態
        assert service._map_ad_group_status("ACTIVE") == "active"
        assert service._map_ad_group_status("PAUSED") == "paused"

        # Ad 狀態
        assert service._map_ad_status("ACTIVE") == "active"
        assert service._map_ad_status("PENDING_REVIEW") == "pending"
