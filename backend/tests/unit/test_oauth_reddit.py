# -*- coding: utf-8 -*-
"""Reddit OAuth 路由單元測試"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


class TestGetAuthUrl:
    """測試授權 URL 生成"""

    @pytest.mark.asyncio
    async def test_get_auth_url_returns_reddit_url(self):
        """應該返回包含 Reddit 授權 URL 的回應"""
        from app.routers.oauth_reddit import get_auth_url, AuthUrlResponse

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_settings = MagicMock()
        mock_settings.REDDIT_CLIENT_ID = "test_client_id"
        mock_settings.REDDIT_CLIENT_SECRET = "test_secret"

        with patch("app.routers.oauth_reddit.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state_123"

            result = await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert isinstance(result, AuthUrlResponse)
            assert "reddit.com/api/v1/authorize" in result.auth_url
            assert result.state == "test_state_123"

    @pytest.mark.asyncio
    async def test_get_auth_url_includes_required_params(self):
        """授權 URL 應包含必要參數"""
        from app.routers.oauth_reddit import get_auth_url

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_settings = MagicMock()
        mock_settings.REDDIT_CLIENT_ID = "test_client_id"
        mock_settings.REDDIT_CLIENT_SECRET = "test_secret"

        with patch("app.routers.oauth_reddit.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state"

            result = await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert "client_id=test_client_id" in result.auth_url
            assert "response_type=code" in result.auth_url
            assert "state=test_state" in result.auth_url
            assert "redirect_uri=" in result.auth_url
            assert "scope=" in result.auth_url
            assert "duration=permanent" in result.auth_url

    @pytest.mark.asyncio
    async def test_get_auth_url_raises_when_client_id_missing(self):
        """缺少 Client ID 時應該拋出 HTTPException"""
        from app.routers.oauth_reddit import get_auth_url
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_settings = MagicMock()
        mock_settings.REDDIT_CLIENT_ID = None
        mock_settings.REDDIT_CLIENT_SECRET = "test_secret"

        with pytest.raises(HTTPException) as exc_info:
            await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

        assert exc_info.value.status_code == 500
        assert "not configured" in exc_info.value.detail.lower()


class TestOAuthCallback:
    """測試 OAuth 回調處理"""

    @pytest.mark.asyncio
    async def test_callback_success_mock_mode(self):
        """Mock 模式下成功處理回調"""
        from app.routers.oauth_reddit import oauth_callback, CallbackResponse

        mock_settings = MagicMock()
        mock_settings.REDDIT_CLIENT_ID = "test_client_id"
        mock_settings.REDDIT_CLIENT_SECRET = "test_secret"

        mock_db = MagicMock()

        user_id = uuid4()
        account_id = uuid4()

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

                    assert isinstance(result, CallbackResponse)
                    assert result.success is True
                    assert result.account_id == str(account_id)

    @pytest.mark.asyncio
    async def test_callback_fails_with_invalid_state(self):
        """無效 state 應返回錯誤"""
        from app.routers.oauth_reddit import oauth_callback

        mock_settings = MagicMock()
        mock_db = MagicMock()

        with patch("app.routers.oauth_reddit.verify_oauth_state", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (False, None, "Invalid state")

            result = await oauth_callback(
                code="test_code",
                state="invalid_state",
                error=None,
                error_description=None,
                redirect_uri="http://localhost:3000/callback",
                db=mock_db,
                settings=mock_settings,
            )

            assert result.success is False
            assert "Invalid state" in result.error

    @pytest.mark.asyncio
    async def test_callback_handles_error_param(self):
        """OAuth 錯誤參數應正確處理"""
        from app.routers.oauth_reddit import oauth_callback

        mock_settings = MagicMock()
        mock_db = MagicMock()

        result = await oauth_callback(
            code=None,
            state="test_state",
            error="access_denied",
            error_description="User denied access",
            redirect_uri="http://localhost:3000/callback",
            db=mock_db,
            settings=mock_settings,
        )

        assert result.success is False
        assert "denied" in result.error.lower()
