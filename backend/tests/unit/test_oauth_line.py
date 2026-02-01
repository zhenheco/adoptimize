# -*- coding: utf-8 -*-
"""LINE Ads 連接路由單元測試"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


class TestLineVerifyCredentials:
    """測試 LINE 憑證驗證"""

    @pytest.mark.asyncio
    async def test_verify_valid_credentials_mock_mode(self):
        """Mock 模式下，有效憑證應返回成功"""
        from app.routers.oauth_line import verify_credentials, VerifyRequest, VerifyResponse

        mock_user = MagicMock()
        mock_user.id = uuid4()

        with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
            result = await verify_credentials(
                request=VerifyRequest(
                    access_key="test_access_key",
                    secret_key="test_secret_key",
                ),
                current_user=mock_user,
            )

            assert isinstance(result, VerifyResponse)
            assert result.valid is True
            assert result.error is None

    @pytest.mark.asyncio
    async def test_verify_empty_access_key(self):
        """空的 access_key 應返回無效"""
        from app.routers.oauth_line import verify_credentials, VerifyRequest, VerifyResponse

        mock_user = MagicMock()
        mock_user.id = uuid4()

        result = await verify_credentials(
            request=VerifyRequest(
                access_key="",
                secret_key="test_secret_key",
            ),
            current_user=mock_user,
        )

        assert isinstance(result, VerifyResponse)
        assert result.valid is False
        assert result.error is not None

    @pytest.mark.asyncio
    async def test_verify_empty_secret_key(self):
        """空的 secret_key 應返回無效"""
        from app.routers.oauth_line import verify_credentials, VerifyRequest, VerifyResponse

        mock_user = MagicMock()
        mock_user.id = uuid4()

        result = await verify_credentials(
            request=VerifyRequest(
                access_key="test_access_key",
                secret_key="",
            ),
            current_user=mock_user,
        )

        assert isinstance(result, VerifyResponse)
        assert result.valid is False
        assert result.error is not None


class TestLineConnectAccount:
    """測試 LINE 帳號連接"""

    @pytest.mark.asyncio
    async def test_connect_with_valid_credentials(self):
        """使用有效憑證應連接成功"""
        from app.routers.oauth_line import connect_account, ConnectRequest, ConnectResponse

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_db = MagicMock()
        account_id = uuid4()

        with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
            with patch("app.routers.oauth_line.TokenManager") as MockTokenManager:
                mock_tm = MagicMock()
                mock_tm.save_new_account = AsyncMock(return_value=account_id)
                MockTokenManager.return_value = mock_tm

                result = await connect_account(
                    request=ConnectRequest(
                        access_key="test_access_key",
                        secret_key="test_secret_key",
                        ad_account_id="123456",
                    ),
                    current_user=mock_user,
                    db=mock_db,
                )

                assert isinstance(result, ConnectResponse)
                assert result.success is True
                assert result.account_id == str(account_id)
                assert result.error is None

    @pytest.mark.asyncio
    async def test_connect_missing_access_key(self):
        """缺少 access_key 應拋出 HTTPException"""
        from app.routers.oauth_line import connect_account, ConnectRequest
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_db = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await connect_account(
                request=ConnectRequest(
                    access_key="",
                    secret_key="test_secret_key",
                    ad_account_id="123456",
                ),
                current_user=mock_user,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_connect_missing_secret_key(self):
        """缺少 secret_key 應拋出 HTTPException"""
        from app.routers.oauth_line import connect_account, ConnectRequest
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_db = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await connect_account(
                request=ConnectRequest(
                    access_key="test_access_key",
                    secret_key="",
                    ad_account_id="123456",
                ),
                current_user=mock_user,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_connect_missing_ad_account_id(self):
        """缺少 ad_account_id 應拋出 HTTPException"""
        from app.routers.oauth_line import connect_account, ConnectRequest
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_db = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await connect_account(
                request=ConnectRequest(
                    access_key="test_access_key",
                    secret_key="test_secret_key",
                    ad_account_id="",
                ),
                current_user=mock_user,
                db=mock_db,
            )

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_connect_saves_credentials_correctly(self):
        """應該正確儲存憑證"""
        from app.routers.oauth_line import connect_account, ConnectRequest

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_db = MagicMock()
        account_id = uuid4()

        with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
            with patch("app.routers.oauth_line.TokenManager") as MockTokenManager:
                mock_tm = MagicMock()
                mock_tm.save_new_account = AsyncMock(return_value=account_id)
                MockTokenManager.return_value = mock_tm

                await connect_account(
                    request=ConnectRequest(
                        access_key="my_access_key",
                        secret_key="my_secret_key",
                        ad_account_id="789",
                    ),
                    current_user=mock_user,
                    db=mock_db,
                )

                # 驗證 save_new_account 被正確呼叫
                mock_tm.save_new_account.assert_called_once()
                call_kwargs = mock_tm.save_new_account.call_args.kwargs

                assert call_kwargs["user_id"] == mock_user.id
                assert call_kwargs["platform"] == "line"
                assert call_kwargs["external_id"] == "789"
                assert call_kwargs["access_token"] == "my_access_key"
                assert call_kwargs["refresh_token"] == "my_secret_key"
                # LINE 憑證不會過期，expires_in 應該是很大的值
                assert call_kwargs["expires_in"] >= 86400 * 365 * 10  # 至少 10 年


class TestLineConnectIntegration:
    """
    LINE 連接整合測試（使用 HTTP client）

    注意：這些測試需要完整的應用環境和路由註冊才能執行。
    請確保 Task 3（路由註冊）已完成後再執行這些測試。
    """

    @pytest.fixture
    def mock_user(self):
        """模擬已登入用戶"""
        user = MagicMock()
        user.id = uuid4()
        user.email = "test@example.com"
        return user

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="需要完成 Task 3（路由註冊）後才能執行")
    async def test_connect_endpoint_with_valid_credentials(self, mock_user):
        """使用有效憑證連接成功（HTTP 層級）"""
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        account_id = uuid4()

        with patch("app.routers.oauth_line.get_current_user", return_value=mock_user):
            with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
                with patch("app.routers.oauth_line.TokenManager") as MockTokenManager:
                    mock_tm = MagicMock()
                    mock_tm.save_new_account = AsyncMock(return_value=account_id)
                    MockTokenManager.return_value = mock_tm

                    async with AsyncClient(
                        transport=ASGITransport(app=app),
                        base_url="http://test",
                    ) as client:
                        response = await client.post(
                            "/api/v1/accounts/connect/line/connect",
                            json={
                                "access_key": "test_access_key",
                                "secret_key": "test_secret_key",
                                "ad_account_id": "123456",
                            },
                        )

                    assert response.status_code == 200
                    data = response.json()
                    assert data["success"] is True
                    assert data["account_id"] == str(account_id)

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="需要完成 Task 3（路由註冊）後才能執行")
    async def test_verify_endpoint_with_valid_credentials(self, mock_user):
        """驗證有效憑證成功（HTTP 層級）"""
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        with patch("app.routers.oauth_line.get_current_user", return_value=mock_user):
            with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
                async with AsyncClient(
                    transport=ASGITransport(app=app),
                    base_url="http://test",
                ) as client:
                    response = await client.post(
                        "/api/v1/accounts/connect/line/verify",
                        json={
                            "access_key": "test_access_key",
                            "secret_key": "test_secret_key",
                        },
                    )

                assert response.status_code == 200
                data = response.json()
                assert data["valid"] is True
