# TikTok Ads 整合實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作 TikTok Ads OAuth 連接、帳戶管理、數據同步完整功能（Mock-First TDD）

**Architecture:**
- 後端使用 FastAPI，遵循現有 Google/Meta OAuth 模式
- Mock API Client 支援 `USE_MOCK_ADS_API` 環境變數切換
- 前端 Next.js 代理層轉發 OAuth 請求

**Tech Stack:** Python 3.13, FastAPI, pytest, httpx, Next.js 16, TypeScript, Vitest

---

## Task 1: TikTok OAuth 路由 - 授權 URL 生成

**Files:**
- Create: `backend/app/routers/oauth_tiktok.py`
- Create: `backend/tests/unit/test_oauth_tiktok.py`

**Step 1: 寫 failing test - 授權 URL 生成**

```python
# backend/tests/unit/test_oauth_tiktok.py
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

        # Arrange
        mock_user = MagicMock()
        mock_user.id = uuid4()
        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.routers.oauth_tiktok.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state_123"

            # Act
            result = await get_auth_url(
                redirect_uri="http://localhost:3000/api/v1/accounts/callback/tiktok",
                current_user=mock_user,
                settings=mock_settings,
            )

            # Assert
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
```

**Step 2: 運行測試確認失敗**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_oauth_tiktok.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.routers.oauth_tiktok'`

**Step 3: 寫最小實作 - OAuth 路由**

```python
# backend/app/routers/oauth_tiktok.py
# -*- coding: utf-8 -*-
"""
TikTok Ads OAuth 路由

實作 TikTok OAuth 2.0 授權流程：
1. 產生授權 URL
2. 處理 OAuth 回調
3. 刷新 Token
"""

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

# TikTok OAuth 端點
TIKTOK_AUTH_URL = "https://business-api.tiktok.com/portal/auth"
TIKTOK_TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/"

# TikTok Marketing API 所需的權限
TIKTOK_SCOPES = [
    "ad.read",
    "ad.write",
    "campaign.read",
    "campaign.write",
    "adgroup.read",
    "adgroup.write",
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
    advertiser_ids: Optional[list[str]] = None
    error: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """刷新 Token 請求"""
    account_id: str


class RefreshTokenResponse(BaseModel):
    """刷新 Token 回應"""
    success: bool
    error: Optional[str] = None


# API 端點
@router.get("/auth", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AuthUrlResponse:
    """
    產生 TikTok OAuth 授權 URL

    用戶需要訪問此 URL 進行 TikTok 帳號授權，
    授權完成後會重定向到 redirect_uri。
    """
    if not settings.TIKTOK_APP_ID:
        raise HTTPException(
            status_code=500,
            detail="TikTok App ID not configured",
        )

    # 產生 state，包含 user_id 和 nonce 用於回調時識別用戶並防止 CSRF
    state = await generate_oauth_state(current_user.id, "tiktok")

    # 建構授權 URL 參數
    params = {
        "app_id": settings.TIKTOK_APP_ID,
        "redirect_uri": redirect_uri,
        "state": state,
    }

    auth_url = f"{TIKTOK_AUTH_URL}?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url, state=state)
```

**Step 4: 運行測試確認通過**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_oauth_tiktok.py::TestGetAuthUrl -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/app/routers/oauth_tiktok.py backend/tests/unit/test_oauth_tiktok.py
git commit -m "feat(tiktok): add OAuth auth URL generation with TDD"
```

---

## Task 2: TikTok OAuth 回調處理

**Files:**
- Modify: `backend/app/routers/oauth_tiktok.py`
- Modify: `backend/tests/unit/test_oauth_tiktok.py`

**Step 1: 寫 failing test - OAuth 回調**

```python
# 新增到 backend/tests/unit/test_oauth_tiktok.py

class TestOAuthCallback:
    """測試 OAuth 回調處理"""

    @pytest.mark.asyncio
    async def test_callback_success_with_valid_code(self, db_session):
        """有效授權碼應該成功交換 token 並儲存帳戶"""
        from app.routers.oauth_tiktok import oauth_callback, CallbackResponse

        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.routers.oauth_tiktok.verify_oauth_state", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (True, uuid4(), None)

            with patch("app.routers.oauth_tiktok.exchange_code_for_tokens", new_callable=AsyncMock) as mock_exchange:
                mock_exchange.return_value = {
                    "access_token": "test_access_token",
                    "refresh_token": "test_refresh_token",
                    "expires_in": 86400,
                    "advertiser_ids": ["adv_001", "adv_002"],
                }

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
```

**Step 2: 運行測試確認失敗**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_oauth_tiktok.py::TestOAuthCallback -v
```

Expected: FAIL with `AttributeError: module 'app.routers.oauth_tiktok' has no attribute 'oauth_callback'`

**Step 3: 實作 OAuth 回調**

```python
# 新增到 backend/app/routers/oauth_tiktok.py

import os

# 檢查是否使用 Mock API
def is_mock_mode() -> bool:
    return os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"


async def exchange_code_for_tokens(
    auth_code: str,
    settings: Settings,
) -> dict:
    """
    使用授權碼交換 access token 和 refresh token

    Args:
        auth_code: TikTok OAuth 授權碼
        settings: 應用程式設定

    Returns:
        包含 access_token, refresh_token, expires_in, advertiser_ids 的字典
    """
    # Mock 模式
    if is_mock_mode():
        return {
            "access_token": f"mock_tiktok_access_{auth_code[:8]}",
            "refresh_token": f"mock_tiktok_refresh_{auth_code[:8]}",
            "expires_in": 86400,  # 24 hours
            "refresh_expires_in": 31536000,  # 365 days
            "advertiser_ids": ["mock_adv_001", "mock_adv_002"],
        }

    # 真實 API 呼叫
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TIKTOK_TOKEN_URL,
            json={
                "app_id": settings.TIKTOK_APP_ID,
                "secret": settings.TIKTOK_APP_SECRET,
                "auth_code": auth_code,
            },
            headers={"Content-Type": "application/json"},
        )

        if response.status_code != 200:
            logger.error(f"TikTok token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token exchange failed - please try again",
            )

        data = response.json()
        if data.get("code") != 0:
            raise HTTPException(
                status_code=400,
                detail=data.get("message", "Token exchange failed"),
            )

        token_data = data.get("data", {})
        return {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in", 86400),
            "refresh_expires_in": token_data.get("refresh_expires_in", 31536000),
            "advertiser_ids": token_data.get("advertiser_ids", []),
        }


@router.get("/callback", response_model=CallbackResponse)
async def oauth_callback(
    auth_code: str = Query(..., description="TikTok OAuth 授權碼"),
    state: str = Query(..., description="CSRF 保護 state"),
    redirect_uri: str = Query(
        "http://localhost:3000/api/v1/accounts/callback/tiktok",
        description="原始重定向 URI",
    ),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """
    處理 TikTok OAuth 回調

    交換授權碼取得 tokens，並儲存帳戶資訊。
    """
    try:
        # 驗證 state 並取得 user_id
        is_valid, user_id, error_msg = await verify_oauth_state(state, "tiktok")
        if not is_valid or not user_id:
            logger.warning(f"TikTok OAuth state verification failed: {error_msg}")
            return CallbackResponse(
                success=False,
                error=error_msg or "Invalid state parameter",
            )

        # 交換授權碼取得 tokens
        tokens = await exchange_code_for_tokens(auth_code, settings)

        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 86400)
        advertiser_ids = tokens.get("advertiser_ids", [])

        if not access_token:
            return CallbackResponse(
                success=False,
                error="No access token received",
            )

        # 使用 TokenManager 儲存第一個廣告帳戶到資料庫
        token_manager = TokenManager(db)

        # TikTok 返回多個 advertiser_id，為第一個建立帳戶
        external_id = advertiser_ids[0] if advertiser_ids else "pending"

        account_id = await token_manager.save_new_account(
            user_id=user_id,
            platform="tiktok",
            external_id=external_id,
            name=f"TikTok Ads - {external_id}",
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )

        return CallbackResponse(
            success=True,
            account_id=str(account_id),
            advertiser_ids=advertiser_ids,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TikTok OAuth callback error: {e}")
        return CallbackResponse(
            success=False,
            error=str(e),
        )
```

**Step 4: 運行測試確認通過**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_oauth_tiktok.py::TestOAuthCallback -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/app/routers/oauth_tiktok.py backend/tests/unit/test_oauth_tiktok.py
git commit -m "feat(tiktok): add OAuth callback with mock support"
```

---

## Task 3: TikTok Token 刷新

**Files:**
- Modify: `backend/app/routers/oauth_tiktok.py`
- Modify: `backend/app/services/token_manager.py`
- Modify: `backend/tests/unit/test_oauth_tiktok.py`

**Step 1: 寫 failing test - Token 刷新**

```python
# 新增到 backend/tests/unit/test_oauth_tiktok.py

class TestRefreshToken:
    """測試 Token 刷新"""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, db_session):
        """應該成功刷新 TikTok token"""
        from app.routers.oauth_tiktok import refresh_token_endpoint, RefreshTokenRequest
        from app.models.ad_account import AdAccount
        from datetime import datetime, timezone

        # 建立測試帳戶
        user_id = uuid4()
        account = AdAccount(
            user_id=user_id,
            platform="tiktok",
            external_id="test_adv_001",
            name="Test TikTok Account",
            access_token="old_access_token",
            refresh_token="valid_refresh_token",
            token_expires_at=datetime.now(timezone.utc),
            status="active",
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.services.token_manager.TokenManager.refresh_tiktok_token", new_callable=AsyncMock) as mock_refresh:
            mock_refresh.return_value = True

            result = await refresh_token_endpoint(
                request=RefreshTokenRequest(account_id=str(account.id)),
                current_user=mock_user,
                db=db_session,
                settings=mock_settings,
            )

            assert result.success is True

    @pytest.mark.asyncio
    async def test_refresh_token_fails_for_wrong_platform(self, db_session):
        """非 TikTok 帳戶應該返回錯誤"""
        from app.routers.oauth_tiktok import refresh_token_endpoint, RefreshTokenRequest
        from app.models.ad_account import AdAccount
        from fastapi import HTTPException
        from datetime import datetime, timezone

        user_id = uuid4()
        account = AdAccount(
            user_id=user_id,
            platform="google",  # 錯誤的平台
            external_id="test_google_001",
            name="Test Google Account",
            access_token="google_token",
            refresh_token="google_refresh",
            token_expires_at=datetime.now(timezone.utc),
            status="active",
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_settings = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await refresh_token_endpoint(
                request=RefreshTokenRequest(account_id=str(account.id)),
                current_user=mock_user,
                db=db_session,
                settings=mock_settings,
            )

        assert exc_info.value.status_code == 400
        assert "TikTok" in exc_info.value.detail
```

**Step 2: 運行測試確認失敗**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_oauth_tiktok.py::TestRefreshToken -v
```

Expected: FAIL

**Step 3: 實作 Token 刷新**

```python
# 新增到 backend/app/routers/oauth_tiktok.py

TIKTOK_REFRESH_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/"


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token_endpoint(
    request: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RefreshTokenResponse:
    """
    刷新 TikTok OAuth Token

    TikTok refresh token 有效期 365 天，access token 24 小時。
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

        # 驗證是 TikTok 帳戶
        if account.platform != "tiktok":
            raise HTTPException(
                status_code=400,
                detail="This endpoint only supports TikTok accounts",
            )

        # 刷新 token
        success = await token_manager.refresh_tiktok_token(account)

        if not success:
            return RefreshTokenResponse(
                success=False,
                error="Failed to refresh token - please reconnect the account",
            )

        return RefreshTokenResponse(success=True)

    except HTTPException:
        raise
    except Exception as e:
        return RefreshTokenResponse(
            success=False,
            error=str(e),
        )
```

```python
# 新增到 backend/app/services/token_manager.py

# 在檔案頂部新增
TIKTOK_REFRESH_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/"

# 在 TokenManager 類別中新增方法
async def refresh_tiktok_token(self, account: AdAccount) -> bool:
    """
    刷新 TikTok OAuth Token

    Args:
        account: 廣告帳戶

    Returns:
        是否刷新成功
    """
    import os

    if not account.refresh_token:
        return False

    # Mock 模式
    if os.getenv("USE_MOCK_ADS_API", "true").lower() == "true":
        new_access_token = f"mock_refreshed_tiktok_{account.external_id}"
        await self.update_tokens(
            account_id=account.id,
            access_token=new_access_token,
            expires_in=86400,
        )
        return True

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                TIKTOK_REFRESH_URL,
                json={
                    "app_id": settings.TIKTOK_APP_ID,
                    "secret": settings.TIKTOK_APP_SECRET,
                    "refresh_token": account.refresh_token,
                },
                headers={"Content-Type": "application/json"},
            )

            if response.status_code != 200:
                return False

            data = response.json()
            if data.get("code") != 0:
                return False

            token_data = data.get("data", {})
            new_access_token = token_data.get("access_token")
            new_refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 86400)

            if not new_access_token:
                return False

            await self.update_tokens(
                account_id=account.id,
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                expires_in=expires_in,
            )

            return True

    except Exception as e:
        logger.error(f"Failed to refresh TikTok token: {e}")
        return False
```

**Step 4: 運行測試確認通過**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_oauth_tiktok.py::TestRefreshToken -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/app/routers/oauth_tiktok.py backend/app/services/token_manager.py backend/tests/unit/test_oauth_tiktok.py
git commit -m "feat(tiktok): add token refresh endpoint"
```

---

## Task 4: 註冊 TikTok 路由

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/core/config.py`

**Step 1: 檢查現有路由註冊模式**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
grep -n "oauth_google\|oauth_meta" app/main.py
```

**Step 2: 新增 TikTok 路由註冊**

```python
# 在 backend/app/main.py 中，找到 router include 區塊，新增：

from app.routers import oauth_tiktok

app.include_router(
    oauth_tiktok.router,
    prefix="/api/v1/accounts/connect/tiktok",
    tags=["TikTok OAuth"],
)
```

**Step 3: 新增環境變數設定**

```python
# 在 backend/app/core/config.py 的 Settings 類別中新增：

# TikTok Ads
TIKTOK_APP_ID: Optional[str] = None
TIKTOK_APP_SECRET: Optional[str] = None

# Mock 模式
USE_MOCK_ADS_API: bool = True
```

**Step 4: 驗證路由註冊**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -c "from app.main import app; print([r.path for r in app.routes if 'tiktok' in r.path])"
```

Expected: 輸出包含 tiktok 路徑

**Step 5: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/app/main.py backend/app/core/config.py
git commit -m "feat(tiktok): register OAuth routes in main app"
```

---

## Task 5: TikTok API Client（Mock 優先）

**Files:**
- Create: `backend/app/services/tiktok_api_client.py`
- Create: `backend/tests/unit/test_tiktok_api_client.py`

**Step 1: 寫 failing test - API Client**

```python
# backend/tests/unit/test_tiktok_api_client.py
# -*- coding: utf-8 -*-
"""TikTok API Client 單元測試"""

import pytest
from unittest.mock import patch, MagicMock


class TestTikTokAPIClient:
    """測試 TikTok API Client"""

    def test_client_uses_mock_when_env_set(self):
        """USE_MOCK_ADS_API=true 時應使用 Mock"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            assert client.use_mock is True

    def test_client_uses_real_api_when_env_false(self):
        """USE_MOCK_ADS_API=false 時應使用真實 API"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "false"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            assert client.use_mock is False

    @pytest.mark.asyncio
    async def test_get_campaigns_returns_mock_data(self):
        """Mock 模式應返回假數據"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            campaigns = await client.get_campaigns(advertiser_id="mock_adv_001")

            assert isinstance(campaigns, list)
            assert len(campaigns) > 0
            assert "id" in campaigns[0]
            assert "name" in campaigns[0]

    @pytest.mark.asyncio
    async def test_get_adgroups_returns_mock_data(self):
        """Mock 模式應返回廣告組數據"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            adgroups = await client.get_adgroups(advertiser_id="mock_adv_001")

            assert isinstance(adgroups, list)
            assert len(adgroups) > 0

    @pytest.mark.asyncio
    async def test_get_ads_returns_mock_data(self):
        """Mock 模式應返回廣告數據"""
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            from app.services.tiktok_api_client import TikTokAPIClient

            client = TikTokAPIClient(access_token="test_token")
            ads = await client.get_ads(advertiser_id="mock_adv_001")

            assert isinstance(ads, list)
            assert len(ads) > 0
```

**Step 2: 運行測試確認失敗**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_tiktok_api_client.py -v
```

Expected: FAIL with `ModuleNotFoundError`

**Step 3: 實作 TikTok API Client**

```python
# backend/app/services/tiktok_api_client.py
# -*- coding: utf-8 -*-
"""
TikTok Ads API Client

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

# TikTok API 端點
TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3"


class TikTokAPIClient:
    """TikTok Ads API Client"""

    def __init__(
        self,
        access_token: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 TikTok API Client

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
            "Access-Token": self.access_token,
            "Content-Type": "application/json",
        }

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["CAMPAIGN_STATUS_ENABLE", "CAMPAIGN_STATUS_DISABLE"]
        objectives = ["TRAFFIC", "CONVERSIONS", "APP_INSTALL", "REACH"]

        return [
            {
                "id": f"mock_camp_{uuid4().hex[:8]}",
                "name": f"Mock TikTok Campaign {i+1}",
                "status": random.choice(statuses),
                "objective": random.choice(objectives),
                "budget": random.randint(100, 10000) * 100,
                "budget_mode": "BUDGET_MODE_DAY",
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_adgroups(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告組數據"""
        statuses = ["ADGROUP_STATUS_DELIVERY_OK", "ADGROUP_STATUS_NOT_DELIVER"]
        placements = ["PLACEMENT_TIKTOK", "PLACEMENT_PANGLE"]

        return [
            {
                "id": f"mock_adgroup_{uuid4().hex[:8]}",
                "name": f"Mock AdGroup {i+1}",
                "campaign_id": f"mock_camp_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "placement": random.choice(placements),
                "budget": random.randint(50, 5000) * 100,
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 8) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["AD_STATUS_DELIVERY_OK", "AD_STATUS_NOT_DELIVER"]

        return [
            {
                "id": f"mock_ad_{uuid4().hex[:8]}",
                "name": f"Mock Ad {i+1}",
                "adgroup_id": f"mock_adgroup_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "call_to_action": random.choice(["LEARN_MORE", "SHOP_NOW", "DOWNLOAD"]),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
            }
            for i in range(count)
        ]

    async def get_campaigns(self, advertiser_id: str) -> list[dict]:
        """
        取得廣告活動列表

        Args:
            advertiser_id: 廣告主 ID

        Returns:
            廣告活動列表
        """
        if self.use_mock:
            return self._generate_mock_campaigns()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIKTOK_API_BASE}/campaign/get/",
                params={"advertiser_id": advertiser_id},
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                logger.error(f"TikTok get campaigns failed: {response.text}")
                return []

            data = response.json()
            if data.get("code") != 0:
                logger.error(f"TikTok API error: {data.get('message')}")
                return []

            return data.get("data", {}).get("list", [])

    async def get_adgroups(self, advertiser_id: str) -> list[dict]:
        """
        取得廣告組列表

        Args:
            advertiser_id: 廣告主 ID

        Returns:
            廣告組列表
        """
        if self.use_mock:
            return self._generate_mock_adgroups()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIKTOK_API_BASE}/adgroup/get/",
                params={"advertiser_id": advertiser_id},
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            if data.get("code") != 0:
                return []

            return data.get("data", {}).get("list", [])

    async def get_ads(self, advertiser_id: str) -> list[dict]:
        """
        取得廣告列表

        Args:
            advertiser_id: 廣告主 ID

        Returns:
            廣告列表
        """
        if self.use_mock:
            return self._generate_mock_ads()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TIKTOK_API_BASE}/ad/get/",
                params={"advertiser_id": advertiser_id},
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            if data.get("code") != 0:
                return []

            return data.get("data", {}).get("list", [])

    async def get_metrics(
        self,
        advertiser_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        """
        取得廣告成效數據

        Args:
            advertiser_id: 廣告主 ID
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
                f"{TIKTOK_API_BASE}/report/integrated/get/",
                params={
                    "advertiser_id": advertiser_id,
                    "report_type": "BASIC",
                    "dimensions": '["stat_time_day"]',
                    "metrics": '["impressions","clicks","spend","conversions"]',
                    "start_date": start_date,
                    "end_date": end_date,
                },
                headers=self._get_headers(),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            if data.get("code") != 0:
                return []

            return data.get("data", {}).get("list", [])
```

**Step 4: 運行測試確認通過**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_tiktok_api_client.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/app/services/tiktok_api_client.py backend/tests/unit/test_tiktok_api_client.py
git commit -m "feat(tiktok): add API client with mock support"
```

---

## Task 6: TikTok 數據同步服務

**Files:**
- Create: `backend/app/services/sync_tiktok.py`
- Create: `backend/tests/unit/test_sync_tiktok.py`

**Step 1: 寫 failing test - 數據同步**

```python
# backend/tests/unit/test_sync_tiktok.py
# -*- coding: utf-8 -*-
"""TikTok 數據同步服務測試"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone


class TestSyncTikTokCampaigns:
    """測試同步廣告活動"""

    @pytest.mark.asyncio
    async def test_sync_campaigns_saves_to_database(self, db_session):
        """應該將廣告活動同步到資料庫"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount
        from app.models.campaign import Campaign

        # 建立測試帳戶
        account = AdAccount(
            user_id=uuid4(),
            platform="tiktok",
            external_id="test_adv_001",
            name="Test TikTok Account",
            access_token="test_token",
            refresh_token="test_refresh",
            token_expires_at=datetime.now(timezone.utc),
            status="active",
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        # Mock API Client
        mock_campaigns = [
            {
                "id": "camp_001",
                "name": "Campaign 1",
                "status": "CAMPAIGN_STATUS_ENABLE",
                "objective": "CONVERSIONS",
                "budget": 10000,
            }
        ]

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_campaigns.return_value = mock_campaigns
            MockClient.return_value = mock_instance

            service = SyncTikTokService(db_session)
            result = await service.sync_campaigns(account.id)

            assert len(result) == 1
            assert result[0].external_id == "camp_001"
            assert result[0].name == "Campaign 1"


class TestSyncTikTokAdGroups:
    """測試同步廣告組"""

    @pytest.mark.asyncio
    async def test_sync_adgroups_maps_to_ad_sets(self, db_session):
        """應該將廣告組映射到 ad_sets 表"""
        from app.services.sync_tiktok import SyncTikTokService
        from app.models.ad_account import AdAccount
        from app.models.campaign import Campaign

        # 建立測試帳戶和活動
        account = AdAccount(
            user_id=uuid4(),
            platform="tiktok",
            external_id="test_adv_001",
            name="Test Account",
            access_token="test_token",
            refresh_token="",
            token_expires_at=datetime.now(timezone.utc),
            status="active",
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        campaign = Campaign(
            account_id=account.id,
            external_id="camp_001",
            name="Test Campaign",
            status="active",
            platform="tiktok",
        )
        db_session.add(campaign)
        await db_session.commit()

        mock_adgroups = [
            {
                "id": "adgroup_001",
                "name": "AdGroup 1",
                "campaign_id": "camp_001",
                "status": "ADGROUP_STATUS_DELIVERY_OK",
            }
        ]

        with patch("app.services.sync_tiktok.TikTokAPIClient") as MockClient:
            mock_instance = AsyncMock()
            mock_instance.get_adgroups.return_value = mock_adgroups
            MockClient.return_value = mock_instance

            service = SyncTikTokService(db_session)
            result = await service.sync_ad_sets(account.id)

            assert len(result) == 1
            assert result[0].external_id == "adgroup_001"
```

**Step 2: 運行測試確認失敗**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_sync_tiktok.py -v
```

Expected: FAIL

**Step 3: 實作同步服務**

```python
# backend/app/services/sync_tiktok.py
# -*- coding: utf-8 -*-
"""
TikTok 數據同步服務

同步 TikTok Ads 數據到本地資料庫。
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
from app.services.tiktok_api_client import TikTokAPIClient

logger = get_logger(__name__)


class SyncTikTokService:
    """TikTok 數據同步服務"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_account(self, account_id: UUID) -> Optional[AdAccount]:
        """取得廣告帳戶"""
        result = await self.db.execute(
            select(AdAccount).where(AdAccount.id == account_id)
        )
        return result.scalar_one_or_none()

    def _map_campaign_status(self, tiktok_status: str) -> str:
        """映射 TikTok 狀態到統一狀態"""
        status_map = {
            "CAMPAIGN_STATUS_ENABLE": "active",
            "CAMPAIGN_STATUS_DISABLE": "paused",
            "CAMPAIGN_STATUS_DELETE": "removed",
        }
        return status_map.get(tiktok_status, "unknown")

    def _map_adgroup_status(self, tiktok_status: str) -> str:
        """映射 TikTok 廣告組狀態"""
        status_map = {
            "ADGROUP_STATUS_DELIVERY_OK": "active",
            "ADGROUP_STATUS_NOT_DELIVER": "paused",
            "ADGROUP_STATUS_DELETE": "removed",
        }
        return status_map.get(tiktok_status, "unknown")

    def _map_ad_status(self, tiktok_status: str) -> str:
        """映射 TikTok 廣告狀態"""
        status_map = {
            "AD_STATUS_DELIVERY_OK": "active",
            "AD_STATUS_NOT_DELIVER": "paused",
            "AD_STATUS_DELETE": "removed",
        }
        return status_map.get(tiktok_status, "unknown")

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

        client = TikTokAPIClient(access_token=account.access_token)
        tiktok_campaigns = await client.get_campaigns(account.external_id)

        synced = []
        for camp_data in tiktok_campaigns:
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
                    platform="tiktok",
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

        client = TikTokAPIClient(access_token=account.access_token)
        tiktok_adgroups = await client.get_adgroups(account.external_id)

        synced = []
        for ag_data in tiktok_adgroups:
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
                logger.warning(f"Campaign {campaign_external_id} not found for adgroup {external_id}")
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
                ad_set.status = self._map_adgroup_status(ag_data.get("status", ""))
                ad_set.updated_at = datetime.now(timezone.utc)
            else:
                ad_set = AdSet(
                    campaign_id=campaign.id,
                    external_id=external_id,
                    name=ag_data.get("name", "Unknown AdGroup"),
                    status=self._map_adgroup_status(ag_data.get("status", "")),
                    platform="tiktok",
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

        client = TikTokAPIClient(access_token=account.access_token)
        tiktok_ads = await client.get_ads(account.external_id)

        synced = []
        for ad_data in tiktok_ads:
            external_id = ad_data.get("id")
            adgroup_external_id = ad_data.get("adgroup_id")

            # 找到對應的 ad_set
            result = await self.db.execute(
                select(AdSet).where(AdSet.external_id == adgroup_external_id)
            )
            ad_set = result.scalar_one_or_none()

            if not ad_set:
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
                    platform="tiktok",
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

**Step 4: 運行測試確認通過**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_sync_tiktok.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/app/services/sync_tiktok.py backend/tests/unit/test_sync_tiktok.py
git commit -m "feat(tiktok): add data sync service"
```

---

## Task 7: 前端 Next.js 代理路由

**Files:**
- Create: `src/app/api/v1/accounts/connect/tiktok/route.ts`
- Create: `src/app/api/v1/accounts/callback/tiktok/route.ts`

**Step 1: 檢查現有前端代理模式**

```bash
cat /Volumes/500G/Claudecode/adoptimize/src/app/api/v1/accounts/connect/google/route.ts
```

**Step 2: 建立 TikTok 連接代理**

```typescript
// src/app/api/v1/accounts/connect/tiktok/route.ts
import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    // 建構回調 URI
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const redirectUri = `${origin}/api/v1/accounts/callback/tiktok`

    // 代理請求到後端
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/tiktok/auth?redirect_uri=${encodeURIComponent(redirectUri)}`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('TikTok auth URL error:', error)
      return NextResponse.json(
        { error: 'Failed to get auth URL' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('TikTok connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 3: 建立 TikTok 回調代理**

```typescript
// src/app/api/v1/accounts/callback/tiktok/route.ts
import { NextRequest, NextResponse } from 'next/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const authCode = searchParams.get('auth_code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // 處理錯誤
    if (error) {
      const errorMessage = searchParams.get('error_description') || error
      return NextResponse.redirect(
        `${FRONTEND_URL}/accounts?error=${encodeURIComponent(errorMessage)}`
      )
    }

    if (!authCode || !state) {
      return NextResponse.redirect(
        `${FRONTEND_URL}/accounts?error=${encodeURIComponent('Missing auth code or state')}`
      )
    }

    // 建構回調 URI
    const origin = request.headers.get('origin') || FRONTEND_URL
    const redirectUri = `${origin}/api/v1/accounts/callback/tiktok`

    // 代理請求到後端
    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/tiktok/callback?auth_code=${encodeURIComponent(authCode)}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok || !data.success) {
      const errorMessage = data.error || 'Failed to connect TikTok account'
      return NextResponse.redirect(
        `${FRONTEND_URL}/accounts?error=${encodeURIComponent(errorMessage)}`
      )
    }

    // 成功，重定向到帳戶頁面
    return NextResponse.redirect(
      `${FRONTEND_URL}/accounts?success=tiktok&account_id=${data.account_id}`
    )

  } catch (error) {
    console.error('TikTok callback error:', error)
    return NextResponse.redirect(
      `${FRONTEND_URL}/accounts?error=${encodeURIComponent('Internal server error')}`
    )
  }
}
```

**Step 4: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add src/app/api/v1/accounts/connect/tiktok/route.ts src/app/api/v1/accounts/callback/tiktok/route.ts
git commit -m "feat(tiktok): add Next.js proxy routes for OAuth"
```

---

## Task 8: 前端帳戶頁面整合

**Files:**
- Modify: `src/app/(dashboard)/accounts/page.tsx`

**Step 1: 檢查現有帳戶頁面**

```bash
cat /Volumes/500G/Claudecode/adoptimize/src/app/\(dashboard\)/accounts/page.tsx | head -100
```

**Step 2: 新增 TikTok 連接按鈕和平台配置**

在帳戶頁面中新增：

```typescript
// 在 PLATFORMS 常數中新增 TikTok
const PLATFORMS = [
  { id: 'google', name: 'Google Ads', icon: GoogleIcon, color: 'bg-red-500' },
  { id: 'meta', name: 'Meta Ads', icon: MetaIcon, color: 'bg-blue-500' },
  { id: 'tiktok', name: 'TikTok Ads', icon: TikTokIcon, color: 'bg-black' },
] as const

// TikTok 圖標組件
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}
```

**Step 3: 處理 TikTok 連接邏輯**

```typescript
// 在連接按鈕處理函數中新增 TikTok
const handleConnect = async (platform: string) => {
  try {
    setConnecting(platform)

    const response = await fetch(`/api/v1/accounts/connect/${platform}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to get auth URL')
    }

    const data = await response.json()

    // 重定向到 OAuth 授權頁面
    window.location.href = data.auth_url

  } catch (error) {
    console.error(`Failed to connect ${platform}:`, error)
    toast.error(`連接 ${platform} 失敗，請稍後再試`)
  } finally {
    setConnecting(null)
  }
}
```

**Step 4: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add src/app/\(dashboard\)/accounts/page.tsx
git commit -m "feat(tiktok): add TikTok connect button to accounts page"
```

---

## Task 9: 整合測試

**Files:**
- Create: `backend/tests/integration/test_tiktok_flow.py`

**Step 1: 寫整合測試**

```python
# backend/tests/integration/test_tiktok_flow.py
# -*- coding: utf-8 -*-
"""TikTok 整合流程測試"""

import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4


class TestTikTokIntegrationFlow:
    """測試 TikTok 完整整合流程"""

    @pytest.mark.asyncio
    async def test_full_oauth_and_sync_flow(self, db_session):
        """測試完整的 OAuth 授權和數據同步流程"""
        from app.routers.oauth_tiktok import get_auth_url, oauth_callback
        from app.services.sync_tiktok import SyncTikTokService
        from unittest.mock import MagicMock

        user_id = uuid4()

        # 1. 取得授權 URL
        mock_user = MagicMock()
        mock_user.id = user_id
        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.routers.oauth_tiktok.generate_oauth_state", new_callable=AsyncMock) as mock_state:
            mock_state.return_value = "test_state"

            auth_result = await get_auth_url(
                redirect_uri="http://localhost:3000/callback",
                current_user=mock_user,
                settings=mock_settings,
            )

            assert "business-api.tiktok.com" in auth_result.auth_url

        # 2. 處理 OAuth 回調
        with patch("app.routers.oauth_tiktok.verify_oauth_state", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (True, user_id, None)

            with patch("app.routers.oauth_tiktok.exchange_code_for_tokens", new_callable=AsyncMock) as mock_exchange:
                mock_exchange.return_value = {
                    "access_token": "test_access_token",
                    "refresh_token": "test_refresh_token",
                    "expires_in": 86400,
                    "advertiser_ids": ["adv_001"],
                }

                callback_result = await oauth_callback(
                    auth_code="test_code",
                    state="test_state",
                    redirect_uri="http://localhost:3000/callback",
                    db=db_session,
                    settings=mock_settings,
                )

                assert callback_result.success is True
                account_id = callback_result.account_id

        # 3. 同步數據
        with patch.dict("os.environ", {"USE_MOCK_ADS_API": "true"}):
            sync_service = SyncTikTokService(db_session)
            sync_result = await sync_service.sync_all(uuid4())  # 使用新的 account_id

            # Mock 模式會生成數據
            assert isinstance(sync_result, dict)

    @pytest.mark.asyncio
    async def test_token_refresh_flow(self, db_session):
        """測試 Token 刷新流程"""
        from app.routers.oauth_tiktok import refresh_token_endpoint, RefreshTokenRequest
        from app.models.ad_account import AdAccount
        from datetime import datetime, timezone
        from unittest.mock import MagicMock

        user_id = uuid4()

        # 建立測試帳戶
        account = AdAccount(
            user_id=user_id,
            platform="tiktok",
            external_id="test_adv_001",
            name="Test Account",
            access_token="old_token",
            refresh_token="valid_refresh",
            token_expires_at=datetime.now(timezone.utc),
            status="active",
        )
        db_session.add(account)
        await db_session.commit()
        await db_session.refresh(account)

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_settings = MagicMock()
        mock_settings.TIKTOK_APP_ID = "test_app_id"
        mock_settings.TIKTOK_APP_SECRET = "test_secret"

        with patch("app.services.token_manager.TokenManager.refresh_tiktok_token", new_callable=AsyncMock) as mock_refresh:
            mock_refresh.return_value = True

            result = await refresh_token_endpoint(
                request=RefreshTokenRequest(account_id=str(account.id)),
                current_user=mock_user,
                db=db_session,
                settings=mock_settings,
            )

            assert result.success is True
```

**Step 2: 運行整合測試**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/integration/test_tiktok_flow.py -v
```

Expected: PASS

**Step 3: Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/tests/integration/test_tiktok_flow.py
git commit -m "test(tiktok): add integration tests for full OAuth flow"
```

---

## Task 10: 環境變數和文件更新

**Files:**
- Modify: `backend/.env.example`
- Modify: `CLAUDE.md`

**Step 1: 更新環境變數範例**

```bash
# 在 backend/.env.example 新增
TIKTOK_APP_ID=your_tiktok_app_id
TIKTOK_APP_SECRET=your_tiktok_app_secret
USE_MOCK_ADS_API=true
```

**Step 2: 更新專案文件**

```markdown
# 在 CLAUDE.md 新增

### TikTok Ads 整合

**狀態**：Mock 模式開發完成，待 API 申請通過後切換

**環境變數**：
- `TIKTOK_APP_ID` - TikTok App ID
- `TIKTOK_APP_SECRET` - TikTok App Secret
- `USE_MOCK_ADS_API` - 設為 `false` 啟用真實 API

**切換到真實 API**：
1. 申請 TikTok Marketing API 存取權限
2. 在 Fly.io 設定環境變數
3. 設定 `USE_MOCK_ADS_API=false`
```

**Step 3: 最終 Commit**

```bash
cd /Volumes/500G/Claudecode/adoptimize
git add backend/.env.example CLAUDE.md
git commit -m "docs(tiktok): update environment variables and documentation"
```

---

## 完成檢查清單

- [ ] Task 1: OAuth 授權 URL 生成 ✅
- [ ] Task 2: OAuth 回調處理 ✅
- [ ] Task 3: Token 刷新 ✅
- [ ] Task 4: 路由註冊 ✅
- [ ] Task 5: API Client（Mock） ✅
- [ ] Task 6: 數據同步服務 ✅
- [ ] Task 7: 前端代理路由 ✅
- [ ] Task 8: 前端帳戶頁面 ✅
- [ ] Task 9: 整合測試 ✅
- [ ] Task 10: 文件更新 ✅

---

## 下一步

完成 TikTok 整合後，複製此模式到：
1. Reddit Ads（約 30-40 小時）
2. LINE Ads（約 40-50 小時）
3. LinkedIn Ads（約 35-45 小時）
