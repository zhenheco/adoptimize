# LinkedIn Ads 整合實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作 LinkedIn Marketing API 完整整合，包含 OAuth 2.0 認證、API Client 和資料同步

**Architecture:** LinkedIn 使用標準 OAuth 2.0 流程（類似 TikTok/Reddit），但 token 有效期長達 60 天。API 需要特殊 headers：`X-Restli-Protocol-Version` 和 `Linkedin-Version`。

**Tech Stack:** FastAPI, SQLAlchemy, httpx, Next.js

---

## 📋 驗收標準

- [ ] AC1: 可以產生 LinkedIn OAuth 授權 URL
- [ ] AC2: 可以處理 OAuth callback 並交換 token
- [ ] AC3: 可以刷新 LinkedIn token
- [ ] AC4: 可以取得 LinkedIn 廣告帳號列表
- [ ] AC5: 可以取得 LinkedIn 廣告活動列表（Mock 和真實 API）
- [ ] AC6: 可以取得 LinkedIn 廣告組列表
- [ ] AC7: 可以取得 LinkedIn 廣告列表
- [ ] AC8: 可以同步 LinkedIn 數據到統一資料模型
- [ ] AC9: 前端可以顯示 LinkedIn 連接按鈕
- [ ] AC10: 所有測試通過（單元測試 + 整合測試）

## 🧪 測試計劃

| 測試案例 | 對應 AC | 類型 |
|---------|--------|------|
| test_generate_auth_url | AC1 | Unit |
| test_auth_url_contains_required_params | AC1 | Unit |
| test_exchange_code_for_tokens | AC2 | Unit |
| test_oauth_callback_success | AC2 | Unit |
| test_refresh_token | AC3 | Unit |
| test_get_ad_accounts_mock_mode | AC4 | Unit |
| test_get_campaigns_mock_mode | AC5 | Unit |
| test_get_campaign_groups_mock_mode | AC6 | Unit |
| test_get_creatives_mock_mode | AC7 | Unit |
| test_sync_campaigns_to_unified_model | AC8 | Unit |
| test_status_mapping | AC8 | Unit |
| test_linkedin_oauth_flow | AC1, AC2 | Integration |
| test_linkedin_sync_flow | AC8 | Integration |

## 🔑 LinkedIn Marketing API 認證機制

LinkedIn 使用標準 OAuth 2.0，但 token 有效期較長：

```
Authorization URL: https://www.linkedin.com/oauth/v2/authorization
Token URL: https://www.linkedin.com/oauth/v2/accessToken
Token 有效期: 60 天 (5,184,000 秒)
Scopes: r_ads, rw_ads, r_basicprofile

API Base: https://api.linkedin.com/rest
必要 Headers:
- Authorization: Bearer {access_token}
- X-Restli-Protocol-Version: 2.0.0
- Linkedin-Version: 202501 (年月格式)
```

## 📝 TDD 實作步驟

---

### Task 1: OAuth 授權 URL 產生

**Files:**
- Create: `backend/app/routers/oauth_linkedin.py`
- Test: `backend/tests/unit/test_oauth_linkedin.py`

**Step 1: 🔴 撰寫失敗測試**

```python
# backend/tests/unit/test_oauth_linkedin.py
"""LinkedIn Ads OAuth 路由測試"""

import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4

from app.routers.oauth_linkedin import (
    get_auth_url,
    AuthUrlResponse,
)


class TestLinkedInAuthUrl:
    """測試 LinkedIn OAuth 授權 URL"""

    @pytest.fixture
    def mock_user(self):
        """模擬已登入用戶"""
        from unittest.mock import MagicMock
        user = MagicMock()
        user.id = uuid4()
        user.email = "test@example.com"
        return user

    @pytest.fixture
    def mock_settings(self):
        """模擬設定"""
        from unittest.mock import MagicMock
        settings = MagicMock()
        settings.LINKEDIN_CLIENT_ID = "test_client_id"
        settings.LINKEDIN_CLIENT_SECRET = "test_client_secret"
        return settings

    @pytest.mark.asyncio
    async def test_generate_auth_url_returns_url(self, mock_user, mock_settings):
        """應該回傳授權 URL"""
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
```

**Step 2: 確認紅燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_oauth_linkedin.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: 🟢 實作**

```python
# backend/app/routers/oauth_linkedin.py
# -*- coding: utf-8 -*-
"""
LinkedIn Ads OAuth 路由

實作 LinkedIn OAuth 2.0 授權流程：
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

# LinkedIn OAuth 端點
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"

# LinkedIn Marketing API 所需的權限
LINKEDIN_SCOPES = [
    "r_ads",
    "rw_ads",
    "r_basicprofile",
    "r_organization_admin",
]


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
    產生 LinkedIn OAuth 授權 URL

    用戶需要訪問此 URL 進行 LinkedIn 帳號授權，
    授權完成後會重定向到 redirect_uri。
    """
    if not settings.LINKEDIN_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn Client ID not configured",
        )

    # 產生 state
    state = await generate_oauth_state(current_user.id, "linkedin")

    # 建構授權 URL 參數
    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": " ".join(LINKEDIN_SCOPES),
    }

    auth_url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url, state=state)
```

**Step 4: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_oauth_linkedin.py::TestLinkedInAuthUrl -v`
Expected: PASS

**Step 5: 🔵 Commit**

```bash
git add backend/app/routers/oauth_linkedin.py backend/tests/unit/test_oauth_linkedin.py
git commit -m "feat(linkedin): add OAuth auth URL generation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: OAuth Callback 處理

**Files:**
- Modify: `backend/app/routers/oauth_linkedin.py`
- Modify: `backend/tests/unit/test_oauth_linkedin.py`

**Step 1: 🔴 新增測試**

```python
class TestLinkedInCallback:
    """測試 LinkedIn OAuth 回調"""

    @pytest.fixture
    def mock_settings(self):
        from unittest.mock import MagicMock
        settings = MagicMock()
        settings.LINKEDIN_CLIENT_ID = "test_client_id"
        settings.LINKEDIN_CLIENT_SECRET = "test_client_secret"
        return settings

    @pytest.mark.asyncio
    async def test_callback_success_mock_mode(self, mock_settings):
        """Mock 模式下回調應該成功"""
        from app.routers.oauth_linkedin import exchange_code_for_tokens

        with patch("app.routers.oauth_linkedin.is_mock_mode", return_value=True):
            tokens = await exchange_code_for_tokens(
                code="test_code",
                redirect_uri="http://localhost:3000/callback",
                settings=mock_settings,
            )

            assert "access_token" in tokens
            assert "refresh_token" in tokens
            assert tokens["expires_in"] == 5184000  # 60 天

    @pytest.mark.asyncio
    async def test_callback_extracts_tokens(self, mock_settings):
        """應該正確提取 tokens"""
        from app.routers.oauth_linkedin import exchange_code_for_tokens

        with patch("app.routers.oauth_linkedin.is_mock_mode", return_value=True):
            tokens = await exchange_code_for_tokens(
                code="auth_code_123",
                redirect_uri="http://localhost:3000/callback",
                settings=mock_settings,
            )

            assert tokens["access_token"].startswith("mock_linkedin_access_")
            assert tokens["refresh_token"].startswith("mock_linkedin_refresh_")
```

**Step 2: 🟢 實作 callback 處理**

在 `oauth_linkedin.py` 中新增：

```python
async def exchange_code_for_tokens(
    code: str,
    redirect_uri: str,
    settings: Settings,
) -> dict:
    """使用授權碼交換 access token 和 refresh token"""
    if is_mock_mode():
        return {
            "access_token": f"mock_linkedin_access_{code[:8]}",
            "refresh_token": f"mock_linkedin_refresh_{code[:8]}",
            "expires_in": 5184000,  # 60 天
            "scope": " ".join(LINKEDIN_SCOPES),
        }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )

        if response.status_code != 200:
            logger.error(f"LinkedIn token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token exchange failed",
            )

        data = response.json()
        return {
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "expires_in": data.get("expires_in", 5184000),
            "scope": data.get("scope", ""),
        }


@router.get("/callback", response_model=CallbackResponse)
async def oauth_callback(
    code: Optional[str] = Query(None),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    redirect_uri: str = Query(
        "http://localhost:3000/api/v1/accounts/callback/linkedin",
    ),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """處理 LinkedIn OAuth 回調"""
    try:
        if error:
            return CallbackResponse(
                success=False,
                error=f"Authorization denied: {error_description or error}",
            )

        if not code:
            return CallbackResponse(
                success=False,
                error="No authorization code received",
            )

        # 驗證 state
        is_valid, user_id, error_msg = await verify_oauth_state(state, "linkedin")
        if not is_valid or not user_id:
            return CallbackResponse(
                success=False,
                error=error_msg or "Invalid state parameter",
            )

        # 交換 tokens
        tokens = await exchange_code_for_tokens(code, redirect_uri, settings)

        # 儲存帳戶
        token_manager = TokenManager(db)
        external_id = f"linkedin_user_{user_id.hex[:8]}"

        account_id = await token_manager.save_new_account(
            user_id=user_id,
            platform="linkedin",
            external_id=external_id,
            name=f"LinkedIn Ads - {external_id}",
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=tokens["expires_in"],
        )

        return CallbackResponse(
            success=True,
            account_id=str(account_id),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LinkedIn OAuth callback error: {e}")
        return CallbackResponse(success=False, error=str(e))
```

**Step 3: 確認綠燈**
**Step 4: 🔵 Commit**

---

### Task 3: Token 刷新

**Files:**
- Modify: `backend/app/routers/oauth_linkedin.py`
- Modify: `backend/app/services/token_manager.py`

實作 `refresh_linkedin_token` 方法，雖然 LinkedIn token 有效期 60 天，仍需支援刷新機制。

---

### Task 4: 路由註冊

**Files:**
- Modify: `backend/app/routers/__init__.py`

新增 LinkedIn 路由：

```python
from app.routers import oauth_linkedin

api_router.include_router(
    oauth_linkedin.router,
    prefix="/accounts/connect/linkedin",
    tags=["OAuth - LinkedIn"],
)
```

---

### Task 5: LinkedIn API Client

**Files:**
- Create: `backend/app/services/linkedin_api_client.py`
- Test: `backend/tests/unit/test_linkedin_api_client.py`

實作 `LinkedInAPIClient` 類別：
- Mock 模式支援
- 特殊 headers: `X-Restli-Protocol-Version`, `Linkedin-Version`
- 方法: `get_ad_accounts()`, `get_campaigns()`, `get_campaign_groups()`, `get_creatives()`, `get_metrics()`

---

### Task 6: LinkedIn Sync Service

**Files:**
- Create: `backend/app/services/sync_linkedin.py`
- Test: `backend/tests/unit/test_sync_linkedin.py`

狀態映射規則：
- Campaign: ACTIVE→active, PAUSED→paused, ARCHIVED→removed, DRAFT→pending
- Creative: ACTIVE→active, PAUSED→paused, REJECTED→rejected, PENDING_REVIEW→pending

---

### Task 7: 前端 Proxy 路由

**Files:**
- Create: `app/api/v1/accounts/connect/linkedin/route.ts`
- Create: `app/api/v1/accounts/callback/linkedin/route.ts`

---

### Task 8: 前端帳號頁面更新

**Files:**
- Modify: `app/(dashboard)/accounts/page.tsx`

新增：
- LinkedIn 平台類型和樣式 (藍色)
- LinkedIn 連接按鈕

---

### Task 9: 環境變數和配置

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/app/core/config.py`

新增：
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

---

### Task 10: 整合測試和驗證

**Files:**
- Create: `backend/tests/integration/test_linkedin_flow.py`

執行完整測試套件確認沒有破壞現有功能。

---

## 📊 預期測試覆蓋

- OAuth 路由：90%+
- API Client：90%+
- Sync Service：90%+
- 整合測試：80%+

## 📝 與其他平台的差異

| 項目 | TikTok | Reddit | LINE | LinkedIn |
|------|--------|--------|------|----------|
| 認證方式 | OAuth 2.0 | OAuth 2.0 + Basic Auth | JWS (HS256) | OAuth 2.0 |
| Token 類型 | Access Token | Access Token | Access Key | Access Token |
| Token 過期 | 24 小時 | 1 小時 | 永不過期 | 60 天 |
| 連接方式 | OAuth 重定向 | OAuth 重定向 | 手動輸入 | OAuth 重定向 |
| 特殊 Headers | - | User-Agent | JWS Auth | X-Restli-Protocol-Version |
| API 版本 | v1.3 | v2.0 | v3 | versioned (yyyymm) |

## 🔗 參考資料

- [LinkedIn OAuth 2.0](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn 3-Legged OAuth Flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [Campaign Management API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/getting-started)
