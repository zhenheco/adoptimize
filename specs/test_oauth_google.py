# -*- coding: utf-8 -*-
"""
Google Ads OAuth 路由測試
遵循 TDD 原則：先寫測試，再寫實作

測試涵蓋:
1. 產生授權 URL
2. OAuth 回調處理
3. Token 儲存與更新
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from uuid import uuid4

# 測試用常數
MOCK_CLIENT_ID = "test-client-id"
MOCK_CLIENT_SECRET = "test-client-secret"
MOCK_REDIRECT_URI = "http://localhost:3000/api/v1/accounts/callback/google"
MOCK_AUTH_CODE = "test-auth-code"
MOCK_ACCESS_TOKEN = "test-access-token"
MOCK_REFRESH_TOKEN = "test-refresh-token"
MOCK_CUSTOMER_ID = "1234567890"


class TestGoogleOAuthInitiate:
    """測試 Google OAuth 授權初始化"""

    def test_get_auth_url_returns_valid_url(self, client: TestClient):
        """
        驗收標準 AC1：呼叫 /auth 端點應返回有效的 Google OAuth URL
        """
        response = client.get(
            "/api/v1/accounts/connect/google/auth",
            params={"redirect_uri": MOCK_REDIRECT_URI}
        )

        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "accounts.google.com" in data["auth_url"]
        assert "client_id" in data["auth_url"]
        assert "redirect_uri" in data["auth_url"]

    def test_get_auth_url_includes_required_scopes(self, client: TestClient):
        """
        驗收標準 AC2：授權 URL 應包含 Google Ads API 所需的 scope
        """
        response = client.get(
            "/api/v1/accounts/connect/google/auth",
            params={"redirect_uri": MOCK_REDIRECT_URI}
        )

        data = response.json()
        auth_url = data["auth_url"]
        # Google Ads API 需要此 scope
        assert "https://www.googleapis.com/auth/adwords" in auth_url

    def test_get_auth_url_without_redirect_uri_fails(self, client: TestClient):
        """
        驗收標準 AC3：缺少 redirect_uri 應返回 422 錯誤
        """
        response = client.get("/api/v1/accounts/connect/google/auth")
        assert response.status_code == 422


class TestGoogleOAuthCallback:
    """測試 Google OAuth 回調處理"""

    @pytest.mark.asyncio
    async def test_callback_exchanges_code_for_tokens(self, client: TestClient):
        """
        驗收標準 AC4：使用 auth code 交換 access token 和 refresh token
        """
        with patch("app.routers.oauth_google.exchange_code_for_tokens") as mock_exchange:
            mock_exchange.return_value = {
                "access_token": MOCK_ACCESS_TOKEN,
                "refresh_token": MOCK_REFRESH_TOKEN,
                "expires_in": 3600,
            }

            response = client.get(
                "/api/v1/accounts/connect/google/callback",
                params={
                    "code": MOCK_AUTH_CODE,
                    "state": "test-state",
                }
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "account_id" in data

    def test_callback_without_code_fails(self, client: TestClient):
        """
        驗收標準 AC5：缺少 auth code 應返回錯誤
        """
        response = client.get("/api/v1/accounts/connect/google/callback")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_callback_stores_tokens_in_database(self, client: TestClient):
        """
        驗收標準 AC6：成功後應將 tokens 儲存到資料庫
        """
        with patch("app.routers.oauth_google.exchange_code_for_tokens") as mock_exchange, \
             patch("app.routers.oauth_google.get_google_ads_customer_ids") as mock_customer, \
             patch("app.routers.oauth_google.save_ad_account") as mock_save:

            mock_exchange.return_value = {
                "access_token": MOCK_ACCESS_TOKEN,
                "refresh_token": MOCK_REFRESH_TOKEN,
                "expires_in": 3600,
            }
            mock_customer.return_value = [MOCK_CUSTOMER_ID]
            mock_save.return_value = uuid4()

            response = client.get(
                "/api/v1/accounts/connect/google/callback",
                params={"code": MOCK_AUTH_CODE, "state": "test-state"}
            )

            assert response.status_code == 200
            # 驗證 save_ad_account 被呼叫
            mock_save.assert_called()


class TestGoogleOAuthTokenRefresh:
    """測試 Token 刷新功能"""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: TestClient):
        """
        驗收標準 AC7：使用 refresh token 可以取得新的 access token
        """
        with patch("app.routers.oauth_google.refresh_access_token") as mock_refresh:
            mock_refresh.return_value = {
                "access_token": "new-access-token",
                "expires_in": 3600,
            }

            response = client.post(
                "/api/v1/accounts/connect/google/refresh",
                json={"account_id": str(uuid4())}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

    @pytest.mark.asyncio
    async def test_refresh_token_not_found_fails(self, client: TestClient):
        """
        驗收標準 AC8：找不到帳戶時應返回 404
        """
        response = client.post(
            "/api/v1/accounts/connect/google/refresh",
            json={"account_id": str(uuid4())}
        )

        assert response.status_code == 404


# Fixtures
@pytest.fixture
def client():
    """建立測試用 HTTP 客戶端"""
    from app.main import app
    from fastapi.testclient import TestClient
    return TestClient(app)
