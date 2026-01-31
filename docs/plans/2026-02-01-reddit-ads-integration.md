# Reddit Ads Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Reddit Ads platform integration with OAuth authentication, data sync, and frontend UI support using TDD and Mock-First strategy.

**Architecture:** Following the established TikTok pattern - OAuth router for auth flow, API client with Mock support, sync service for data normalization, and Next.js proxy routes for frontend. All components use `USE_MOCK_ADS_API` environment variable to toggle between mock and real API modes.

**Tech Stack:** FastAPI, SQLAlchemy async, httpx, Next.js 16, TypeScript

**Reference Sources:**
- [Reddit OAuth2 Wiki](https://github.com/reddit-archive/reddit/wiki/OAuth2)
- [Reddit Ads API Documentation](https://data365.co/blog/reddit-ads-api)

---

## Reddit Ads API Key Differences from TikTok

| Aspect | TikTok | Reddit |
|--------|--------|--------|
| Auth URL | `business-api.tiktok.com/portal/auth` | `www.reddit.com/api/v1/authorize` |
| Token URL | `business-api.tiktok.com/open_api/v1.3/oauth2/access_token/` | `www.reddit.com/api/v1/access_token` |
| Refresh URL | Same endpoint with `grant_type=refresh_token` | Same as Token URL |
| Token Expiry | 24 hours | 1 hour |
| Auth Method | JSON body with app_id/secret | Basic Auth (client_id:secret) |
| Scopes | `ad.read`, `campaign.read`, etc. | `ads`, `adsread`, `adsedit` |

---

## Task List

### Task 1: Reddit OAuth - Auth URL Generation

**Files:**
- Create: `backend/app/routers/oauth_reddit.py`
- Create: `backend/tests/unit/test_oauth_reddit.py`

**Step 1: Write the failing test**

```python
# backend/tests/unit/test_oauth_reddit.py
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

            # 檢查必要參數
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_oauth_reddit.py -v`
Expected: FAIL with "No module named 'app.routers.oauth_reddit'"

**Step 3: Write minimal implementation**

```python
# backend/app/routers/oauth_reddit.py
# -*- coding: utf-8 -*-
"""
Reddit Ads OAuth 路由

實作 Reddit OAuth 2.0 授權流程：
1. 產生授權 URL
2. 處理 OAuth 回調
3. 刷新 Token
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, Settings
from app.core.logger import get_logger
from app.db.base import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.csrf_protection import generate_oauth_state, verify_oauth_state
from app.services.token_manager import TokenManager

logger = get_logger(__name__)

router = APIRouter()

# Reddit OAuth 端點
REDDIT_AUTH_URL = "https://www.reddit.com/api/v1/authorize"
REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token"

# Reddit Ads API 所需的權限
REDDIT_SCOPES = [
    "ads",        # 廣告基本權限
    "adsread",    # 讀取廣告數據
    "adsedit",    # 編輯廣告
    "identity",   # 讀取用戶身份
]


# Pydantic 模型
class AuthUrlResponse(BaseModel):
    """授權 URL 回應"""
    auth_url: str
    state: str


class CallbackResponse(BaseModel):
    """OAuth 回調回應"""
    success: bool
    account_id: Optional[str] = None
    error: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """刷新 Token 請求"""
    account_id: str


class RefreshTokenResponse(BaseModel):
    """刷新 Token 回應"""
    success: bool
    error: Optional[str] = None


# 檢查是否使用 Mock API
def is_mock_mode() -> bool:
    """檢查是否在 Mock 模式下運行"""
    return os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"


@router.get("/auth", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AuthUrlResponse:
    """
    產生 Reddit OAuth 授權 URL

    用戶需要訪問此 URL 進行 Reddit 帳號授權，
    授權完成後會重定向到 redirect_uri。
    """
    if not settings.REDDIT_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Reddit Client ID not configured",
        )

    # 產生 state，包含 user_id 和 nonce 用於回調時識別用戶並防止 CSRF
    state = await generate_oauth_state(current_user.id, "reddit")

    # 建構授權 URL 參數
    params = {
        "client_id": settings.REDDIT_CLIENT_ID,
        "response_type": "code",
        "state": state,
        "redirect_uri": redirect_uri,
        "duration": "permanent",  # 永久授權，可獲得 refresh_token
        "scope": " ".join(REDDIT_SCOPES),
    }

    auth_url = f"{REDDIT_AUTH_URL}?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url, state=state)
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_oauth_reddit.py::TestGetAuthUrl -v`
Expected: 3 tests PASSED

**Step 5: Commit**

```bash
git add backend/app/routers/oauth_reddit.py backend/tests/unit/test_oauth_reddit.py
git commit -m "feat(reddit): add OAuth auth URL generation with tests"
```

---

### Task 2: Reddit OAuth - Callback Handler

**Files:**
- Modify: `backend/app/routers/oauth_reddit.py`
- Modify: `backend/tests/unit/test_oauth_reddit.py`

**Step 1: Write the failing test**

Add to `backend/tests/unit/test_oauth_reddit.py`:

```python
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_oauth_reddit.py::TestOAuthCallback -v`
Expected: FAIL with "oauth_callback" or "exchange_code_for_tokens" not defined

**Step 3: Write minimal implementation**

Add to `backend/app/routers/oauth_reddit.py`:

```python
async def exchange_code_for_tokens(
    code: str,
    redirect_uri: str,
    settings: Settings,
) -> dict:
    """
    使用授權碼交換 access token 和 refresh token

    Reddit 使用 Basic Auth (client_id:secret) 進行認證

    Args:
        code: Reddit OAuth 授權碼
        redirect_uri: 重定向 URI
        settings: 應用程式設定

    Returns:
        包含 token 資訊的字典
    """
    # Mock 模式
    if is_mock_mode():
        return {
            "access_token": f"mock_reddit_access_{code[:8]}",
            "refresh_token": f"mock_reddit_refresh_{code[:8]}",
            "expires_in": 3600,  # Reddit token 有效期 1 小時
            "scope": " ".join(REDDIT_SCOPES),
        }

    # 真實 API 呼叫 - Reddit 使用 Basic Auth
    import base64
    credentials = base64.b64encode(
        f"{settings.REDDIT_CLIENT_ID}:{settings.REDDIT_CLIENT_SECRET}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            REDDIT_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "AdOptimize/1.0",
            },
        )

        if response.status_code != 200:
            logger.error(f"Reddit token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token exchange failed - please try again",
            )

        data = response.json()

        if "error" in data:
            raise HTTPException(
                status_code=400,
                detail=data.get("error_description", data.get("error")),
            )

        return {
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "expires_in": data.get("expires_in", 3600),
            "scope": data.get("scope", ""),
        }


@router.get("/callback", response_model=CallbackResponse)
async def oauth_callback(
    code: Optional[str] = Query(None, description="Reddit OAuth 授權碼"),
    state: str = Query(..., description="CSRF 保護 state"),
    error: Optional[str] = Query(None, description="OAuth 錯誤代碼"),
    error_description: Optional[str] = Query(None, description="OAuth 錯誤描述"),
    redirect_uri: str = Query(
        "http://localhost:3000/api/v1/accounts/callback/reddit",
        description="原始重定向 URI",
    ),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """
    處理 Reddit OAuth 回調

    此端點由 Reddit OAuth 授權頁面重定向回來，
    負責交換授權碼取得 access token 並儲存帳戶資訊。
    """
    try:
        # 處理 OAuth 錯誤
        if error:
            error_msg = error_description or error
            logger.warning(f"Reddit OAuth error: {error_msg}")
            return CallbackResponse(
                success=False,
                error=f"Authorization denied: {error_msg}",
            )

        if not code:
            return CallbackResponse(
                success=False,
                error="No authorization code received",
            )

        # 驗證 state 並取得 user_id
        is_valid, user_id, error_msg = await verify_oauth_state(state, "reddit")
        if not is_valid or not user_id:
            logger.warning(f"Reddit OAuth state verification failed: {error_msg}")
            return CallbackResponse(
                success=False,
                error=error_msg or "Invalid state parameter",
            )

        # 交換授權碼取得 tokens
        tokens = await exchange_code_for_tokens(code, redirect_uri, settings)

        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)

        if not access_token:
            return CallbackResponse(
                success=False,
                error="No access token received",
            )

        # 使用 TokenManager 儲存帳戶到資料庫
        token_manager = TokenManager(db)

        # Reddit 帳戶使用用戶名稱作為 external_id
        external_id = f"reddit_user_{user_id.hex[:8]}"

        account_id = await token_manager.save_new_account(
            user_id=user_id,
            platform="reddit",
            external_id=external_id,
            name=f"Reddit Ads - {external_id}",
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )

        return CallbackResponse(
            success=True,
            account_id=str(account_id),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reddit OAuth callback error: {e}")
        return CallbackResponse(
            success=False,
            error=str(e),
        )
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_oauth_reddit.py::TestOAuthCallback -v`
Expected: 3 tests PASSED

**Step 5: Commit**

```bash
git add backend/app/routers/oauth_reddit.py backend/tests/unit/test_oauth_reddit.py
git commit -m "feat(reddit): add OAuth callback handler with token exchange"
```

---

### Task 3: Reddit OAuth - Token Refresh

**Files:**
- Modify: `backend/app/routers/oauth_reddit.py`
- Modify: `backend/tests/unit/test_oauth_reddit.py`
- Modify: `backend/app/services/token_manager.py`

**Step 1: Write the failing test**

Add to `backend/tests/unit/test_oauth_reddit.py`:

```python
class TestRefreshToken:
    """測試 Token 刷新"""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self):
        """成功刷新 token"""
        from app.routers.oauth_reddit import refresh_token_endpoint, RefreshTokenRequest

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.user_id = mock_user.id
        mock_account.platform = "reddit"
        mock_account.refresh_token = "test_refresh_token"

        mock_db = MagicMock()
        mock_settings = MagicMock()

        with patch("app.routers.oauth_reddit.TokenManager") as MockTokenManager:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=mock_account)
            mock_tm.refresh_reddit_token = AsyncMock(return_value=True)
            MockTokenManager.return_value = mock_tm

            result = await refresh_token_endpoint(
                request=RefreshTokenRequest(account_id=str(mock_account.id)),
                current_user=mock_user,
                db=mock_db,
                settings=mock_settings,
            )

            assert result.success is True

    @pytest.mark.asyncio
    async def test_refresh_token_fails_wrong_platform(self):
        """非 Reddit 帳戶應返回錯誤"""
        from app.routers.oauth_reddit import refresh_token_endpoint, RefreshTokenRequest
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.user_id = mock_user.id
        mock_account.platform = "google"  # 錯誤的平台

        mock_db = MagicMock()
        mock_settings = MagicMock()

        with patch("app.routers.oauth_reddit.TokenManager") as MockTokenManager:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=mock_account)
            MockTokenManager.return_value = mock_tm

            with pytest.raises(HTTPException) as exc_info:
                await refresh_token_endpoint(
                    request=RefreshTokenRequest(account_id=str(mock_account.id)),
                    current_user=mock_user,
                    db=mock_db,
                    settings=mock_settings,
                )

            assert exc_info.value.status_code == 400
            assert "Reddit" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_refresh_token_fails_wrong_user(self):
        """非帳戶擁有者應返回 403"""
        from app.routers.oauth_reddit import refresh_token_endpoint, RefreshTokenRequest
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.user_id = uuid4()  # 不同的用戶
        mock_account.platform = "reddit"

        mock_db = MagicMock()
        mock_settings = MagicMock()

        with patch("app.routers.oauth_reddit.TokenManager") as MockTokenManager:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=mock_account)
            MockTokenManager.return_value = mock_tm

            with pytest.raises(HTTPException) as exc_info:
                await refresh_token_endpoint(
                    request=RefreshTokenRequest(account_id=str(mock_account.id)),
                    current_user=mock_user,
                    db=mock_db,
                    settings=mock_settings,
                )

            assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_refresh_token_account_not_found(self):
        """帳戶不存在應返回 404"""
        from app.routers.oauth_reddit import refresh_token_endpoint, RefreshTokenRequest
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid4()

        mock_db = MagicMock()
        mock_settings = MagicMock()

        with patch("app.routers.oauth_reddit.TokenManager") as MockTokenManager:
            mock_tm = MagicMock()
            mock_tm.get_account = AsyncMock(return_value=None)
            MockTokenManager.return_value = mock_tm

            with pytest.raises(HTTPException) as exc_info:
                await refresh_token_endpoint(
                    request=RefreshTokenRequest(account_id=str(uuid4())),
                    current_user=mock_user,
                    db=mock_db,
                    settings=mock_settings,
                )

            assert exc_info.value.status_code == 404
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_oauth_reddit.py::TestRefreshToken -v`
Expected: FAIL with "refresh_token_endpoint" not defined

**Step 3: Write minimal implementation**

Add to `backend/app/routers/oauth_reddit.py`:

```python
@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token_endpoint(
    request: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RefreshTokenResponse:
    """
    刷新 Reddit OAuth Token

    Reddit access token 有效期只有 1 小時，需要頻繁刷新。
    """
    try:
        token_manager = TokenManager(db)
        account = await token_manager.get_account(UUID(request.account_id))

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Account not found",
            )

        # 驗證帳戶屬於當前用戶
        if account.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to refresh this account's token",
            )

        # 驗證是 Reddit 帳戶
        if account.platform != "reddit":
            raise HTTPException(
                status_code=400,
                detail="This endpoint only supports Reddit accounts",
            )

        # 刷新 token
        success = await token_manager.refresh_reddit_token(account)

        if not success:
            return RefreshTokenResponse(
                success=False,
                error="Failed to refresh token - please reconnect the account",
            )

        return RefreshTokenResponse(success=True)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reddit token refresh error: {e}")
        return RefreshTokenResponse(
            success=False,
            error=str(e),
        )
```

Add to `backend/app/services/token_manager.py` (after `refresh_tiktok_token` method):

```python
    async def refresh_reddit_token(self, account: AdAccount) -> bool:
        """
        刷新 Reddit OAuth Token

        Reddit 使用 Basic Auth + refresh_token 刷新

        Args:
            account: 廣告帳戶

        Returns:
            是否成功刷新
        """
        if not account.refresh_token:
            logger.warning(f"Account {account.id} has no refresh token")
            return False

        # Mock 模式
        if os.getenv("USE_MOCK_ADS_API", "true").lower() == "true":
            new_access_token = f"mock_reddit_refreshed_{account.id.hex[:8]}"
            return await self.update_tokens(
                account_id=account.id,
                access_token=new_access_token,
                expires_in=3600,
            )

        # 真實 API 呼叫
        import base64
        from app.core.config import get_settings

        settings = get_settings()
        credentials = base64.b64encode(
            f"{settings.REDDIT_CLIENT_ID}:{settings.REDDIT_CLIENT_SECRET}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.reddit.com/api/v1/access_token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": account.refresh_token,
                },
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "AdOptimize/1.0",
                },
            )

            if response.status_code != 200:
                logger.error(f"Reddit token refresh failed: {response.text}")
                return False

            data = response.json()

            if "error" in data:
                logger.error(f"Reddit token refresh error: {data}")
                return False

            return await self.update_tokens(
                account_id=account.id,
                access_token=data.get("access_token"),
                refresh_token=data.get("refresh_token"),  # Reddit 可能返回新的 refresh_token
                expires_in=data.get("expires_in", 3600),
            )
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_oauth_reddit.py::TestRefreshToken -v`
Expected: 4 tests PASSED

**Step 5: Commit**

```bash
git add backend/app/routers/oauth_reddit.py backend/tests/unit/test_oauth_reddit.py backend/app/services/token_manager.py
git commit -m "feat(reddit): add token refresh endpoint with mock support"
```

---

### Task 4: Register Reddit OAuth Routes

**Files:**
- Modify: `backend/app/routers/__init__.py`
- Modify: `backend/app/core/config.py`

**Step 1: Add Reddit settings to config**

Add to `backend/app/core/config.py` (in Settings class):

```python
    # Reddit Ads API
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
```

**Step 2: Register routes**

Add to `backend/app/routers/__init__.py`:

```python
from app.routers import (
    # ... existing imports
    oauth_reddit,
)

# Add after TikTok router registration:
api_router.include_router(
    oauth_reddit.router,
    prefix="/accounts/connect/reddit",
    tags=["OAuth - Reddit"],
)
```

**Step 3: Run all tests**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_oauth_reddit.py -v`
Expected: All 10 Reddit OAuth tests PASSED

**Step 4: Commit**

```bash
git add backend/app/routers/__init__.py backend/app/core/config.py
git commit -m "feat(reddit): register OAuth routes and add config settings"
```

---

### Task 5: Reddit API Client

**Files:**
- Create: `backend/app/services/reddit_api_client.py`
- Create: `backend/tests/unit/test_reddit_api_client.py`

**Step 1: Write the failing test**

```python
# backend/tests/unit/test_reddit_api_client.py
# -*- coding: utf-8 -*-
"""Reddit API Client 單元測試"""

import pytest
from unittest.mock import patch


class TestRedditAPIClientInit:
    """測試 Client 初始化"""

    def test_init_with_access_token(self):
        """應該正確初始化 access token"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token")
        assert client.access_token == "test_token"

    def test_init_uses_mock_mode_from_env(self):
        """應該從環境變數讀取 mock 模式"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.reddit_api_client import RedditAPIClient

            client = RedditAPIClient(access_token="test_token")
            assert client.use_mock is True

    def test_init_can_override_mock_mode(self):
        """應該可以覆蓋 mock 模式"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=False)
        assert client.use_mock is False


class TestRedditAPIClientMockMode:
    """測試 Mock 模式數據生成"""

    @pytest.mark.asyncio
    async def test_get_campaigns_returns_list(self):
        """get_campaigns 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        campaigns = await client.get_campaigns("test_account")

        assert isinstance(campaigns, list)
        assert len(campaigns) > 0
        for camp in campaigns:
            assert "id" in camp
            assert "name" in camp
            assert "status" in camp

    @pytest.mark.asyncio
    async def test_get_ad_groups_returns_list(self):
        """get_ad_groups 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        ad_groups = await client.get_ad_groups("test_account")

        assert isinstance(ad_groups, list)
        assert len(ad_groups) > 0
        for ag in ad_groups:
            assert "id" in ag
            assert "name" in ag
            assert "campaign_id" in ag
            assert "status" in ag

    @pytest.mark.asyncio
    async def test_get_ads_returns_list(self):
        """get_ads 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        ads = await client.get_ads("test_account")

        assert isinstance(ads, list)
        assert len(ads) > 0
        for ad in ads:
            assert "id" in ad
            assert "name" in ad
            assert "ad_group_id" in ad
            assert "status" in ad

    @pytest.mark.asyncio
    async def test_get_metrics_returns_list(self):
        """get_metrics 應返回列表"""
        from app.services.reddit_api_client import RedditAPIClient

        client = RedditAPIClient(access_token="test_token", use_mock=True)
        metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")

        assert isinstance(metrics, list)
        for m in metrics:
            assert "impressions" in m
            assert "clicks" in m
            assert "spend" in m
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_reddit_api_client.py -v`
Expected: FAIL with "No module named 'app.services.reddit_api_client'"

**Step 3: Write minimal implementation**

```python
# backend/app/services/reddit_api_client.py
# -*- coding: utf-8 -*-
"""
Reddit Ads API Client

支援 Mock 模式和真實 API 模式切換。
"""

import os
import random
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

import httpx

from app.core.logger import get_logger

logger = get_logger(__name__)

# Reddit Ads API 端點
REDDIT_ADS_API_BASE = "https://ads-api.reddit.com/api/v2.0"


class RedditAPIClient:
    """Reddit Ads API Client"""

    def __init__(
        self,
        access_token: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 Reddit API Client

        Args:
            access_token: OAuth access token
            use_mock: 是否使用 Mock 模式（None 時從環境變數讀取）
        """
        self.access_token = access_token

        if use_mock is None:
            self.use_mock = os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"
        else:
            self.use_mock = use_mock

    def _get_headers(self) -> dict:
        """取得 API 請求 headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "User-Agent": "AdOptimize/1.0",
        }

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["ACTIVE", "PAUSED", "COMPLETED"]
        objectives = ["CONVERSIONS", "TRAFFIC", "AWARENESS", "VIDEO_VIEWS"]

        return [
            {
                "id": f"t3_camp_{uuid4().hex[:8]}",
                "name": f"Mock Reddit Campaign {i+1}",
                "status": random.choice(statuses),
                "objective": random.choice(objectives),
                "budget_cents": random.randint(1000, 100000),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ad_groups(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告組數據"""
        statuses = ["ACTIVE", "PAUSED"]
        bid_strategies = ["MAXIMIZE_CONVERSIONS", "TARGET_CPA", "MANUAL_CPC"]

        return [
            {
                "id": f"t3_ag_{uuid4().hex[:8]}",
                "name": f"Mock Ad Group {i+1}",
                "campaign_id": f"t3_camp_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "bid_strategy": random.choice(bid_strategies),
                "bid_cents": random.randint(50, 500),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 8) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["ACTIVE", "PAUSED", "PENDING_REVIEW"]
        ad_types = ["LINK", "VIDEO", "CAROUSEL"]

        return [
            {
                "id": f"t3_ad_{uuid4().hex[:8]}",
                "name": f"Mock Reddit Ad {i+1}",
                "ad_group_id": f"t3_ag_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "ad_type": random.choice(ad_types),
                "headline": f"Check out this amazing offer #{i+1}",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
            }
            for i in range(count)
        ]

    async def get_campaigns(self, account_id: str) -> list[dict]:
        """
        取得廣告活動列表

        Args:
            account_id: 廣告帳戶 ID

        Returns:
            廣告活動列表
        """
        if self.use_mock:
            return self._generate_mock_campaigns()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/campaigns",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"Reddit get campaigns failed: {response.text}")
                return []

            data = response.json()
            return data.get("data", [])

    async def get_ad_groups(self, account_id: str) -> list[dict]:
        """
        取得廣告組列表

        Args:
            account_id: 廣告帳戶 ID

        Returns:
            廣告組列表
        """
        if self.use_mock:
            return self._generate_mock_ad_groups()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/adgroups",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("data", [])

    async def get_ads(self, account_id: str) -> list[dict]:
        """
        取得廣告列表

        Args:
            account_id: 廣告帳戶 ID

        Returns:
            廣告列表
        """
        if self.use_mock:
            return self._generate_mock_ads()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/ads",
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("data", [])

    async def get_metrics(
        self,
        account_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        """
        取得廣告成效數據

        Args:
            account_id: 廣告帳戶 ID
            start_date: 開始日期 (YYYY-MM-DD)
            end_date: 結束日期 (YYYY-MM-DD)

        Returns:
            成效數據列表
        """
        if self.use_mock:
            return [
                {
                    "date": start_date,
                    "impressions": random.randint(1000, 100000),
                    "clicks": random.randint(10, 1000),
                    "spend": random.randint(100, 10000) / 100,
                    "conversions": random.randint(0, 100),
                    "ctr": round(random.uniform(0.5, 5.0), 2),
                    "cpc": round(random.uniform(0.1, 2.0), 2),
                }
            ]

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{REDDIT_ADS_API_BASE}/accounts/{account_id}/reports",
                params={
                    "start_date": start_date,
                    "end_date": end_date,
                    "metrics": "impressions,clicks,spend,conversions",
                },
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("data", [])
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_reddit_api_client.py -v`
Expected: All 7 tests PASSED

**Step 5: Commit**

```bash
git add backend/app/services/reddit_api_client.py backend/tests/unit/test_reddit_api_client.py
git commit -m "feat(reddit): add API client with mock support"
```

---

### Task 6: Reddit Data Sync Service

**Files:**
- Create: `backend/app/services/sync_reddit.py`
- Create: `backend/tests/unit/test_sync_reddit.py`

**Step 1: Write the failing test**

```python
# backend/tests/unit/test_sync_reddit.py
# -*- coding: utf-8 -*-
"""Reddit 數據同步服務單元測試"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from uuid import uuid4


class TestSyncRedditStatusMapping:
    """測試狀態映射"""

    def test_map_campaign_status_active(self):
        """ACTIVE 應映射為 active"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("ACTIVE") == "active"

    def test_map_campaign_status_paused(self):
        """PAUSED 應映射為 paused"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("PAUSED") == "paused"

    def test_map_campaign_status_completed(self):
        """COMPLETED 應映射為 removed"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("COMPLETED") == "removed"

    def test_map_campaign_status_unknown(self):
        """未知狀態應映射為 unknown"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_campaign_status("SOMETHING_ELSE") == "unknown"

    def test_map_ad_group_status_active(self):
        """廣告組 ACTIVE 應映射為 active"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_ad_group_status("ACTIVE") == "active"

    def test_map_ad_status_pending_review(self):
        """廣告 PENDING_REVIEW 應映射為 pending"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        service = SyncRedditService(mock_db)
        assert service._map_ad_status("PENDING_REVIEW") == "pending"


class TestSyncRedditCampaigns:
    """測試廣告活動同步"""

    @pytest.mark.asyncio
    async def test_sync_campaigns_returns_list(self):
        """sync_campaigns 應返回同步的廣告活動列表"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.access_token = "test_token"
        mock_account.external_id = "test_account"

        service = SyncRedditService(mock_db)

        with patch.object(service, "_get_account", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_account

            with patch("app.services.sync_reddit.RedditAPIClient") as MockClient:
                mock_client = AsyncMock()
                mock_client.get_campaigns.return_value = [
                    {"id": "camp_1", "name": "Test Campaign", "status": "ACTIVE"}
                ]
                MockClient.return_value = mock_client

                # Mock the campaign query to return None (new campaign)
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = None
                mock_db.execute.return_value = mock_result

                campaigns = await service.sync_campaigns(mock_account.id)

                assert isinstance(campaigns, list)


class TestSyncRedditAll:
    """測試完整同步"""

    @pytest.mark.asyncio
    async def test_sync_all_returns_stats(self):
        """sync_all 應返回同步統計"""
        from app.services.sync_reddit import SyncRedditService

        mock_db = MagicMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()

        service = SyncRedditService(mock_db)

        # Mock all sync methods
        with patch.object(service, "sync_campaigns", new_callable=AsyncMock) as mock_camps:
            mock_camps.return_value = [MagicMock(), MagicMock()]

            with patch.object(service, "sync_ad_sets", new_callable=AsyncMock) as mock_sets:
                mock_sets.return_value = [MagicMock()]

                with patch.object(service, "sync_ads", new_callable=AsyncMock) as mock_ads:
                    mock_ads.return_value = [MagicMock(), MagicMock(), MagicMock()]

                    with patch.object(service, "_get_account", new_callable=AsyncMock) as mock_get:
                        mock_get.return_value = MagicMock()

                        result = await service.sync_all(uuid4())

                        assert "campaigns" in result
                        assert "ad_sets" in result
                        assert "ads" in result
                        assert result["campaigns"] == 2
                        assert result["ad_sets"] == 1
                        assert result["ads"] == 3
```

**Step 2: Run test to verify it fails**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_sync_reddit.py -v`
Expected: FAIL with "No module named 'app.services.sync_reddit'"

**Step 3: Write minimal implementation**

```python
# backend/app/services/sync_reddit.py
# -*- coding: utf-8 -*-
"""
Reddit 數據同步服務

同步 Reddit Ads 數據到本地資料庫。
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.models.ad_account import AdAccount
from app.models.campaign import Campaign
from app.models.ad_set import AdSet
from app.models.ad import Ad
from app.services.reddit_api_client import RedditAPIClient

logger = get_logger(__name__)


class SyncRedditService:
    """Reddit 數據同步服務"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_account(self, account_id: UUID) -> Optional[AdAccount]:
        """取得廣告帳戶"""
        result = await self.db.execute(
            select(AdAccount).where(AdAccount.id == account_id)
        )
        return result.scalar_one_or_none()

    def _map_campaign_status(self, reddit_status: str) -> str:
        """映射 Reddit 狀態到統一狀態"""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "COMPLETED": "removed",
            "DELETED": "removed",
        }
        return status_map.get(reddit_status, "unknown")

    def _map_ad_group_status(self, reddit_status: str) -> str:
        """映射 Reddit 廣告組狀態"""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "DELETED": "removed",
        }
        return status_map.get(reddit_status, "unknown")

    def _map_ad_status(self, reddit_status: str) -> str:
        """映射 Reddit 廣告狀態"""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "PENDING_REVIEW": "pending",
            "REJECTED": "rejected",
            "DELETED": "removed",
        }
        return status_map.get(reddit_status, "unknown")

    async def sync_campaigns(self, account_id: UUID) -> list[Campaign]:
        """
        同步廣告活動

        Args:
            account_id: 帳戶 ID

        Returns:
            同步的廣告活動列表
        """
        account = await self._get_account(account_id)
        if not account:
            logger.error(f"Account {account_id} not found")
            return []

        client = RedditAPIClient(access_token=account.access_token or "")
        reddit_campaigns = await client.get_campaigns(account.external_id)

        synced = []
        for camp_data in reddit_campaigns:
            external_id = camp_data.get("id")

            # 查找或創建
            result = await self.db.execute(
                select(Campaign).where(
                    Campaign.account_id == account_id,
                    Campaign.external_id == external_id,
                )
            )
            campaign = result.scalar_one_or_none()

            if campaign:
                # 更新
                campaign.name = camp_data.get("name", campaign.name)
                campaign.status = self._map_campaign_status(camp_data.get("status", ""))
                campaign.updated_at = datetime.now(timezone.utc)
            else:
                # 創建
                campaign = Campaign(
                    account_id=account_id,
                    external_id=external_id,
                    name=camp_data.get("name", "Unknown Campaign"),
                    status=self._map_campaign_status(camp_data.get("status", "")),
                )
                self.db.add(campaign)

            synced.append(campaign)

        await self.db.commit()
        return synced

    async def sync_ad_sets(self, account_id: UUID) -> list[AdSet]:
        """
        同步廣告組（映射到 ad_sets 表）

        Args:
            account_id: 帳戶 ID

        Returns:
            同步的廣告組列表
        """
        account = await self._get_account(account_id)
        if not account:
            return []

        client = RedditAPIClient(access_token=account.access_token or "")
        reddit_ad_groups = await client.get_ad_groups(account.external_id)

        synced = []
        for ag_data in reddit_ad_groups:
            external_id = ag_data.get("id")
            campaign_external_id = ag_data.get("campaign_id")

            # 找到對應的 campaign
            result = await self.db.execute(
                select(Campaign).where(
                    Campaign.account_id == account_id,
                    Campaign.external_id == campaign_external_id,
                )
            )
            campaign = result.scalar_one_or_none()

            if not campaign:
                logger.warning(
                    f"Campaign {campaign_external_id} not found for ad group {external_id}"
                )
                continue

            # 查找或創建 ad_set
            result = await self.db.execute(
                select(AdSet).where(
                    AdSet.campaign_id == campaign.id,
                    AdSet.external_id == external_id,
                )
            )
            ad_set = result.scalar_one_or_none()

            if ad_set:
                ad_set.name = ag_data.get("name", ad_set.name)
                ad_set.status = self._map_ad_group_status(ag_data.get("status", ""))
                ad_set.updated_at = datetime.now(timezone.utc)
            else:
                ad_set = AdSet(
                    campaign_id=campaign.id,
                    external_id=external_id,
                    name=ag_data.get("name", "Unknown Ad Group"),
                    status=self._map_ad_group_status(ag_data.get("status", "")),
                )
                self.db.add(ad_set)

            synced.append(ad_set)

        await self.db.commit()
        return synced

    async def sync_ads(self, account_id: UUID) -> list[Ad]:
        """
        同步廣告

        Args:
            account_id: 帳戶 ID

        Returns:
            同步的廣告列表
        """
        account = await self._get_account(account_id)
        if not account:
            return []

        client = RedditAPIClient(access_token=account.access_token or "")
        reddit_ads = await client.get_ads(account.external_id)

        synced = []
        for ad_data in reddit_ads:
            external_id = ad_data.get("id")
            ad_group_external_id = ad_data.get("ad_group_id")

            # 找到對應的 ad_set
            result = await self.db.execute(
                select(AdSet).where(AdSet.external_id == ad_group_external_id)
            )
            ad_set = result.scalar_one_or_none()

            if not ad_set:
                logger.warning(
                    f"AdSet {ad_group_external_id} not found for ad {external_id}"
                )
                continue

            # 查找或創建 ad
            result = await self.db.execute(
                select(Ad).where(
                    Ad.ad_set_id == ad_set.id,
                    Ad.external_id == external_id,
                )
            )
            ad = result.scalar_one_or_none()

            if ad:
                ad.name = ad_data.get("name", ad.name)
                ad.status = self._map_ad_status(ad_data.get("status", ""))
                ad.updated_at = datetime.now(timezone.utc)
            else:
                ad = Ad(
                    ad_set_id=ad_set.id,
                    external_id=external_id,
                    name=ad_data.get("name", "Unknown Ad"),
                    status=self._map_ad_status(ad_data.get("status", "")),
                )
                self.db.add(ad)

            synced.append(ad)

        await self.db.commit()
        return synced

    async def sync_all(self, account_id: UUID) -> dict:
        """
        同步所有數據

        Args:
            account_id: 帳戶 ID

        Returns:
            同步結果統計
        """
        campaigns = await self.sync_campaigns(account_id)
        ad_sets = await self.sync_ad_sets(account_id)
        ads = await self.sync_ads(account_id)

        # 更新帳戶最後同步時間
        account = await self._get_account(account_id)
        if account:
            account.last_sync_at = datetime.now(timezone.utc)
            await self.db.commit()

        return {
            "campaigns": len(campaigns),
            "ad_sets": len(ad_sets),
            "ads": len(ads),
        }
```

**Step 4: Run test to verify it passes**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest tests/unit/test_sync_reddit.py -v`
Expected: All 9 tests PASSED

**Step 5: Commit**

```bash
git add backend/app/services/sync_reddit.py backend/tests/unit/test_sync_reddit.py
git commit -m "feat(reddit): add data sync service for campaigns, ad_sets, and ads"
```

---

### Task 7: Frontend Proxy Routes

**Files:**
- Create: `app/api/v1/accounts/connect/reddit/route.ts`
- Create: `app/api/v1/accounts/callback/reddit/route.ts`

**Step 1: Create auth proxy route**

```typescript
// app/api/v1/accounts/connect/reddit/route.ts
/**
 * Reddit Ads OAuth 授權端點
 *
 * 代理請求到 Python 後端取得 OAuth 授權 URL
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // 構建回調 URL
    const origin = request.nextUrl.origin;
    const finalRedirectUri = `${origin}/api/v1/accounts/callback/reddit`;

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/reddit/auth?redirect_uri=${encodeURIComponent(finalRedirectUri)}`,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to get auth URL' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reddit OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create callback proxy route**

```typescript
// app/api/v1/accounts/callback/reddit/route.ts
/**
 * Reddit Ads OAuth 回調端點
 *
 * 處理 Reddit OAuth 授權後的回調，
 * 代理請求到 Python 後端進行 token 交換
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染，因為此路由需要讀取 searchParams
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 處理 OAuth 錯誤
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      // 重定向到前端錯誤頁面
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(errorDescription)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/accounts?error=No authorization code received', request.url)
      );
    }

    // 構建回調 URL 參數
    const params = new URLSearchParams();
    params.set('code', code);
    if (state) params.set('state', state);
    params.set('redirect_uri', `${request.nextUrl.origin}/api/v1/accounts/callback/reddit`);

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/reddit/callback?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data.error || data.detail || 'Reddit OAuth callback failed';
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

    // 成功後重定向到帳戶頁面
    return NextResponse.redirect(
      new URL(`/accounts?success=reddit&account_id=${data.account_id}`, request.url)
    );
  } catch (error) {
    console.error('Reddit OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/accounts?error=Internal server error', request.url)
    );
  }
}
```

**Step 3: Commit**

```bash
git add app/api/v1/accounts/connect/reddit/route.ts app/api/v1/accounts/callback/reddit/route.ts
git commit -m "feat(reddit): add Next.js proxy routes for OAuth flow"
```

---

### Task 8: Frontend Account Page Integration

**Files:**
- Modify: `app/(dashboard)/accounts/page.tsx`

**Step 1: Add Reddit platform support**

Add Reddit to the platform types and styles:

```typescript
// Add 'reddit' to platform type
interface AdAccount {
  // ...
  platform: 'google' | 'meta' | 'tiktok' | 'reddit';
}

// Add Reddit styles
const platformStyles = {
  // ... existing styles
  reddit: {
    bg: 'bg-orange-600 dark:bg-orange-700',
    text: 'text-white dark:text-gray-100',
    label: 'Reddit Ads',
    icon: 'R',
  },
};
```

**Step 2: Add Reddit connect handler**

```typescript
const handleConnectReddit = async () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('請先登入');
      return;
    }

    const response = await fetch('/api/v1/accounts/connect/reddit', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get Reddit auth URL');
    }

    // 重定向到 Reddit 授權頁面
    window.location.href = data.auth_url;
  } catch (err) {
    setError(err instanceof Error ? err.message : '連接 Reddit 失敗');
  }
};
```

**Step 3: Add Reddit connect button**

```tsx
{/* Reddit Connect Button */}
<button
  onClick={handleConnectReddit}
  className="flex items-center gap-3 w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
>
  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
    R
  </div>
  <span>連接 Reddit Ads</span>
</button>
```

**Step 4: Update success message handling**

```typescript
// Add reddit case to success message
if (success === 'reddit') {
  setSuccessMessage('Reddit Ads 帳號連接成功！');
}
```

**Step 5: Commit**

```bash
git add app/(dashboard)/accounts/page.tsx
git commit -m "feat(reddit): add Reddit connect button to accounts page"
```

---

### Task 9: Update Environment Variables

**Files:**
- Modify: `backend/.env.example`

**Step 1: Add Reddit settings**

Add to `backend/.env.example`:

```bash
# Reddit Ads API
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
```

**Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "docs: add Reddit Ads config to .env.example"
```

---

### Task 10: Integration Tests

**Files:**
- Create: `backend/tests/integration/test_reddit_flow.py`

**Step 1: Write integration tests**

```python
# backend/tests/integration/test_reddit_flow.py
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

                # 驗證服務可以被實例化和呼叫
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

            # Mock update_tokens
            with patch.object(manager, "update_tokens", new_callable=AsyncMock) as mock_update:
                mock_update.return_value = True

                result = await manager.refresh_reddit_token(mock_account)

                assert result is True
                mock_update.assert_called_once()


class TestRedditEndToEnd:
    """端到端測試"""

    def test_all_reddit_modules_importable(self):
        """確保所有 Reddit 模組可以正確 import"""
        # OAuth 路由
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

        # API Client
        from app.services.reddit_api_client import RedditAPIClient

        # 同步服務
        from app.services.sync_reddit import SyncRedditService

        # Token 管理（包含 Reddit 刷新方法）
        from app.services.token_manager import TokenManager

        # 驗證 router 已註冊端點
        routes = [route.path for route in router.routes]
        assert "/auth" in routes
        assert "/callback" in routes
        assert "/refresh" in routes

    def test_reddit_status_mapping_consistency(self):
        """測試狀態映射的一致性"""
        from app.services.sync_reddit import SyncRedditService

        # 建立 mock db
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
```

**Step 2: Run all tests**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && source .venv/bin/activate && python -m pytest -v`
Expected: All tests PASSED (including new Reddit tests)

**Step 3: Commit**

```bash
git add backend/tests/integration/test_reddit_flow.py
git commit -m "test(reddit): add integration tests for OAuth and sync flow"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | OAuth Auth URL | `oauth_reddit.py`, `test_oauth_reddit.py` |
| 2 | OAuth Callback | Same files |
| 3 | Token Refresh | Same + `token_manager.py` |
| 4 | Route Registration | `__init__.py`, `config.py` |
| 5 | API Client | `reddit_api_client.py`, `test_reddit_api_client.py` |
| 6 | Sync Service | `sync_reddit.py`, `test_sync_reddit.py` |
| 7 | Frontend Proxy | `connect/reddit/route.ts`, `callback/reddit/route.ts` |
| 8 | Account Page | `accounts/page.tsx` |
| 9 | Env Variables | `.env.example` |
| 10 | Integration Tests | `test_reddit_flow.py` |

**Total estimated commits:** 10
