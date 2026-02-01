# -*- coding: utf-8 -*-
"""LinkedIn Ads OAuth 路由測試"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4


class TestLinkedInAuthUrl:
    """測試 LinkedIn OAuth 授權 URL"""

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
    async def test_generate_auth_url_returns_url(self, mock_user, mock_settings):
        """應該回傳授權 URL"""
        from app.routers.oauth_linkedin import get_auth_url, AuthUrlResponse

        with patch("app.routers.oauth_linkedin.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state_123"

            result = await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert isinstance(result, AuthUrlResponse)
            assert "linkedin.com/oauth/v2/authorization" in result.auth_url
            assert result.state == "test_state_123"

    @pytest.mark.asyncio
    async def test_auth_url_contains_required_params(self, mock_user, mock_settings):
        """授權 URL 應該包含必要參數"""
        from app.routers.oauth_linkedin import get_auth_url

        with patch("app.routers.oauth_linkedin.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state"

            result = await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert "client_id=test_client_id" in result.auth_url
            assert "response_type=code" in result.auth_url
            assert "redirect_uri=" in result.auth_url
            assert "state=" in result.auth_url
            assert "scope=" in result.auth_url

    @pytest.mark.asyncio
    async def test_auth_url_raises_when_client_id_not_configured(self, mock_user):
        """未設定 Client ID 時應該拋出錯誤"""
        from app.routers.oauth_linkedin import get_auth_url
        from fastapi import HTTPException

        mock_settings = MagicMock()
        mock_settings.LINKEDIN_CLIENT_ID = None

        with pytest.raises(HTTPException) as exc_info:
            await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

        assert exc_info.value.status_code == 500
        assert "not configured" in exc_info.value.detail
