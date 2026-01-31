# -*- coding: utf-8 -*-
"""TikTok OAuth 單元測試"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4


class TestGetAuthUrl:
    """測試授權 URL 生成"""

    @pytest.mark.asyncio
    async def test_get_auth_url_returns_valid_url(self):
        """應該返回有效的 TikTok 授權 URL"""
        from app.routers.oauth_tiktok import get_auth_url, AuthUrlResponse

        mock_user = MagicMock()
        mock_user.id = uuid4()
        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.routers.oauth_tiktok.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state_123"

            result = await get_auth_url(
                redirect_uri="http://localhost:3000/api/v1/accounts/callback/tiktok",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert isinstance(result, AuthUrlResponse)
            assert "business-api.tiktok.com" in result.auth_url
            assert "test_app_id" in result.auth_url
            assert result.state == "test_state_123"

    @pytest.mark.asyncio
    async def test_get_auth_url_raises_when_app_id_not_configured(self):
        """未設定 APP_ID 時應該拋出錯誤"""
        from app.routers.oauth_tiktok import get_auth_url
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()
        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = None

        with pytest.raises(HTTPException) as exc_info:
            await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

        assert exc_info.value.status_code == 500
        assert "not configured" in exc_info.value.detail
