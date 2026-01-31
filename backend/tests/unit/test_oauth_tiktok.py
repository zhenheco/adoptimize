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


class TestOAuthCallback:
    """測試 OAuth 回調處理"""

    @pytest.mark.asyncio
    async def test_callback_success_with_valid_code(self, db_session):
        """有效授權碼應該成功交換 token 並儲存帳戶"""
        from app.routers.oauth_tiktok import oauth_callback, CallbackResponse

        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        mock_account_id = uuid4()

        with patch("app.routers.oauth_tiktok.verify_oauth_state", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (True, uuid4(), None)

            with patch("app.routers.oauth_tiktok.exchange_code_for_tokens", new_callable=AsyncMock) as mock_exchange:
                mock_exchange.return_value = {
                    "access_token": "test_access_token",
                    "refresh_token": "test_refresh_token",
                    "expires_in": 86400,
                    "advertiser_ids": ["adv_001", "adv_002"],
                }

                with patch("app.routers.oauth_tiktok.TokenManager") as mock_token_manager_class:
                    mock_token_manager = MagicMock()
                    mock_token_manager.save_new_account = AsyncMock(return_value=mock_account_id)
                    mock_token_manager_class.return_value = mock_token_manager

                    result = await oauth_callback(
                        auth_code="test_auth_code",
                        state="test_state",
                        redirect_uri="http://localhost:3000/callback",
                        db=db_session,
                        settings=mock_settings,
                    )

                    assert isinstance(result, CallbackResponse)
                    assert result.success is True
                    assert result.account_id is not None
                    assert result.advertiser_ids == ["adv_001", "adv_002"]

    @pytest.mark.asyncio
    async def test_callback_fails_with_invalid_state(self, db_session):
        """無效 state 應該返回錯誤"""
        from app.routers.oauth_tiktok import oauth_callback

        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.routers.oauth_tiktok.verify_oauth_state", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (False, None, "Invalid state")

            result = await oauth_callback(
                auth_code="test_auth_code",
                state="invalid_state",
                redirect_uri="http://localhost:3000/callback",
                db=db_session,
                settings=mock_settings,
            )

            assert result.success is False
            assert "Invalid state" in result.error


class TestRefreshToken:
    """測試 Token 刷新"""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, db_session):
        """應該成功刷新 TikTok token"""
        from app.routers.oauth_tiktok import refresh_token_endpoint, RefreshTokenRequest
        from datetime import datetime, timezone

        # 建立 mock 帳戶
        user_id = uuid4()
        account_id = uuid4()

        mock_account = MagicMock()
        mock_account.id = account_id
        mock_account.user_id = user_id
        mock_account.platform = "tiktok"
        mock_account.external_id = "test_adv_001"
        mock_account.refresh_token = "valid_refresh_token"

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.routers.oauth_tiktok.TokenManager") as mock_tm_class:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=mock_account)
            mock_tm.refresh_tiktok_token = AsyncMock(return_value=True)
            mock_tm_class.return_value = mock_tm

            result = await refresh_token_endpoint(
                request=RefreshTokenRequest(account_id=str(account_id)),
                current_user=mock_user,
                db=db_session,
                settings=mock_settings,
            )

            assert result.success is True
            mock_tm.refresh_tiktok_token.assert_called_once_with(mock_account)

    @pytest.mark.asyncio
    async def test_refresh_token_fails_for_wrong_platform(self, db_session):
        """非 TikTok 帳戶應該返回錯誤"""
        from app.routers.oauth_tiktok import refresh_token_endpoint, RefreshTokenRequest
        from fastapi import HTTPException

        user_id = uuid4()
        account_id = uuid4()

        # 建立 mock 帳戶（Google 平台）
        mock_account = MagicMock()
        mock_account.id = account_id
        mock_account.user_id = user_id
        mock_account.platform = "google"  # 錯誤的平台
        mock_account.external_id = "test_google_001"

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_settings = MagicMock()

        with patch("app.routers.oauth_tiktok.TokenManager") as mock_tm_class:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=mock_account)
            mock_tm_class.return_value = mock_tm

            with pytest.raises(HTTPException) as exc_info:
                await refresh_token_endpoint(
                    request=RefreshTokenRequest(account_id=str(account_id)),
                    current_user=mock_user,
                    db=db_session,
                    settings=mock_settings,
                )

            assert exc_info.value.status_code == 400
            assert "TikTok" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_refresh_token_fails_for_unauthorized_user(self, db_session):
        """非帳戶擁有者應該返回 403 錯誤"""
        from app.routers.oauth_tiktok import refresh_token_endpoint, RefreshTokenRequest
        from fastapi import HTTPException

        account_owner_id = uuid4()
        different_user_id = uuid4()
        account_id = uuid4()

        # 建立 mock 帳戶（屬於 account_owner_id）
        mock_account = MagicMock()
        mock_account.id = account_id
        mock_account.user_id = account_owner_id  # 帳戶屬於其他用戶
        mock_account.platform = "tiktok"
        mock_account.external_id = "test_adv_001"

        mock_user = MagicMock()
        mock_user.id = different_user_id  # 不同的用戶
        mock_settings = MagicMock()

        with patch("app.routers.oauth_tiktok.TokenManager") as mock_tm_class:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=mock_account)
            mock_tm_class.return_value = mock_tm

            with pytest.raises(HTTPException) as exc_info:
                await refresh_token_endpoint(
                    request=RefreshTokenRequest(account_id=str(account_id)),
                    current_user=mock_user,
                    db=db_session,
                    settings=mock_settings,
                )

            assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_refresh_token_fails_for_nonexistent_account(self, db_session):
        """不存在的帳戶應該返回 404 錯誤"""
        from app.routers.oauth_tiktok import refresh_token_endpoint, RefreshTokenRequest
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()
        mock_settings = MagicMock()

        nonexistent_id = str(uuid4())

        with patch("app.routers.oauth_tiktok.TokenManager") as mock_tm_class:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=None)
            mock_tm_class.return_value = mock_tm

            with pytest.raises(HTTPException) as exc_info:
                await refresh_token_endpoint(
                    request=RefreshTokenRequest(account_id=nonexistent_id),
                    current_user=mock_user,
                    db=db_session,
                    settings=mock_settings,
                )

            assert exc_info.value.status_code == 404
