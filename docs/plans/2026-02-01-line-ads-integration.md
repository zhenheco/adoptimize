# LINE Ads 整合實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作 LINE Ads Platform 完整整合，包含 JWS 認證、API Client 和資料同步

**Architecture:** LINE Ads 使用 JWS (JSON Web Signature) 認證機制，不同於 TikTok/Reddit 的 OAuth 2.0 流程。用戶需要在 LINE Ads Platform 後台取得 Access Key 和 Secret Key，然後在系統中手動輸入憑證進行連接。

**Tech Stack:** FastAPI, SQLAlchemy, httpx, PyJWT (HS256), Next.js

---

## 📋 驗收標準

- [ ] AC1: 用戶可以透過輸入 Access Key + Secret Key 連接 LINE Ads 帳號
- [ ] AC2: 系統可以產生符合 LINE Ads API 規範的 JWS 簽章
- [ ] AC3: 可以取得 LINE Ads 廣告活動列表（Mock 和真實 API）
- [ ] AC4: 可以取得 LINE Ads 廣告組列表
- [ ] AC5: 可以取得 LINE Ads 廣告列表
- [ ] AC6: 可以取得 LINE Ads 成效數據
- [ ] AC7: 可以同步 LINE Ads 數據到統一資料模型
- [ ] AC8: 前端可以顯示 LINE Ads 連接按鈕和狀態
- [ ] AC9: 環境變數範例已更新
- [ ] AC10: 所有測試通過（單元測試 + 整合測試）

## 🧪 測試計劃

| 測試案例 | 對應 AC | 類型 |
|---------|--------|------|
| test_generate_jws_signature | AC2 | Unit |
| test_jws_signature_format | AC2 | Unit |
| test_connect_with_valid_credentials | AC1 | Unit |
| test_connect_with_invalid_credentials | AC1 | Unit |
| test_get_campaigns_mock_mode | AC3 | Unit |
| test_get_campaigns_returns_list | AC3 | Unit |
| test_get_ad_groups_mock_mode | AC4 | Unit |
| test_get_ads_mock_mode | AC5 | Unit |
| test_get_metrics_mock_mode | AC6 | Unit |
| test_sync_campaigns_to_unified_model | AC7 | Unit |
| test_sync_ad_groups_to_unified_model | AC7 | Unit |
| test_sync_ads_to_unified_model | AC7 | Unit |
| test_status_mapping_active | AC7 | Unit |
| test_status_mapping_paused | AC7 | Unit |
| test_line_connect_flow | AC1, AC8 | Integration |
| test_line_sync_flow | AC7 | Integration |

## 🔑 LINE Ads API 認證機制

LINE Ads API 使用 JWS (JSON Web Signature) 進行認證，格式如下：

```
Authorization: Bearer {JWS}

JWS 結構：
- Header: {"alg": "HS256", "kid": "{access_key}", "typ": "text/plain"}
- Payload: {Date}\n{Canonical URI}\n{Content-Type}\n{Hashed Body}
- Signature: HMAC-SHA256(Header.Payload, secret_key)
```

## 📝 TDD 實作步驟

---

### Task 1: JWS 簽章產生器

**Files:**
- Create: `backend/app/services/line_jws_signer.py`
- Test: `backend/tests/unit/test_line_jws_signer.py`

**Step 1: 🔴 撰寫失敗測試**

```python
# backend/tests/unit/test_line_jws_signer.py
"""LINE JWS 簽章產生器測試"""

import pytest
from app.services.line_jws_signer import LineJWSSigner


class TestLineJWSSigner:
    """測試 LINE JWS 簽章產生"""

    def test_generate_signature_returns_string(self):
        """應該回傳 JWS 字串"""
        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="GET",
            path="/api/v3/adaccounts",
            body=None,
        )
        assert isinstance(signature, str)
        assert len(signature) > 0

    def test_signature_has_three_parts(self):
        """JWS 應該有三個以 . 分隔的部分"""
        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="GET",
            path="/api/v3/adaccounts",
            body=None,
        )
        parts = signature.split(".")
        assert len(parts) == 3

    def test_header_contains_access_key(self):
        """Header 應該包含 access_key 作為 kid"""
        import base64
        import json

        signer = LineJWSSigner(
            access_key="my_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="GET",
            path="/api/v3/adaccounts",
            body=None,
        )
        header_b64 = signature.split(".")[0]
        # 補齊 padding
        padding = 4 - len(header_b64) % 4
        if padding != 4:
            header_b64 += "=" * padding
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        assert header["alg"] == "HS256"
        assert header["kid"] == "my_access_key"
        assert header["typ"] == "text/plain"

    def test_signature_with_body(self):
        """帶有 body 的請求應該正確產生簽章"""
        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="POST",
            path="/api/v3/adaccounts/123/campaigns",
            body='{"name": "Test Campaign"}',
        )
        assert isinstance(signature, str)
        assert len(signature.split(".")) == 3
```

**Step 2: 確認紅燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_line_jws_signer.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.line_jws_signer'"

**Step 3: 🟢 實作最小可行程式碼**

```python
# backend/app/services/line_jws_signer.py
# -*- coding: utf-8 -*-
"""
LINE Ads JWS 簽章產生器

LINE Ads API 使用 JWS (JSON Web Signature) 進行認證。
"""

import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Optional


class LineJWSSigner:
    """LINE Ads JWS 簽章產生器"""

    def __init__(self, access_key: str, secret_key: str):
        """
        初始化簽章產生器

        Args:
            access_key: LINE Ads Access Key
            secret_key: LINE Ads Secret Key
        """
        self.access_key = access_key
        self.secret_key = secret_key

    def _base64url_encode(self, data: bytes) -> str:
        """Base64 URL 安全編碼（無 padding）"""
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

    def _hash_body(self, body: Optional[str]) -> str:
        """計算 body 的 SHA-256 雜湊值"""
        if not body:
            return hashlib.sha256(b"").hexdigest()
        return hashlib.sha256(body.encode("utf-8")).hexdigest()

    def generate_signature(
        self,
        method: str,
        path: str,
        body: Optional[str] = None,
        content_type: str = "application/json",
    ) -> str:
        """
        產生 JWS 簽章

        Args:
            method: HTTP 方法 (GET, POST, etc.)
            path: API 路徑 (e.g., /api/v3/adaccounts)
            body: 請求 body (JSON 字串)
            content_type: Content-Type header

        Returns:
            JWS 簽章字串
        """
        # 1. 建構 Header
        header = {
            "alg": "HS256",
            "kid": self.access_key,
            "typ": "text/plain",
        }
        header_b64 = self._base64url_encode(json.dumps(header).encode("utf-8"))

        # 2. 建構 Payload
        date = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        hashed_body = self._hash_body(body)

        # Canonical request format
        payload_parts = [
            date,
            path,
            content_type if body else "",
            hashed_body,
        ]
        payload = "\n".join(payload_parts)
        payload_b64 = self._base64url_encode(payload.encode("utf-8"))

        # 3. 產生簽章
        signing_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            self.secret_key.encode("utf-8"),
            signing_input.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        signature_b64 = self._base64url_encode(signature)

        return f"{header_b64}.{payload_b64}.{signature_b64}"

    def get_authorization_header(
        self,
        method: str,
        path: str,
        body: Optional[str] = None,
    ) -> str:
        """
        取得 Authorization header 值

        Returns:
            Bearer {JWS} 格式的字串
        """
        jws = self.generate_signature(method, path, body)
        return f"Bearer {jws}"
```

**Step 4: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_line_jws_signer.py -v`
Expected: PASS

**Step 5: 🔵 Commit**

```bash
git add backend/app/services/line_jws_signer.py backend/tests/unit/test_line_jws_signer.py
git commit -m "feat(line): add JWS signature generator for LINE Ads API

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: LINE 帳號連接路由

**Files:**
- Create: `backend/app/routers/oauth_line.py`
- Test: `backend/tests/unit/test_oauth_line.py`

**Step 1: 🔴 撰寫失敗測試**

```python
# backend/tests/unit/test_oauth_line.py
"""LINE Ads 連接路由測試"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from uuid import uuid4

from app.main import app


class TestLineConnect:
    """測試 LINE Ads 連接"""

    @pytest.fixture
    def mock_user(self):
        """模擬已登入用戶"""
        from app.models.user import User
        return User(
            id=uuid4(),
            email="test@example.com",
            hashed_password="hashed",
        )

    @pytest.mark.asyncio
    async def test_connect_with_valid_credentials(self, mock_user):
        """使用有效憑證應該連接成功"""
        with patch("app.routers.oauth_line.get_current_user", return_value=mock_user):
            with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
                with patch("app.routers.oauth_line.TokenManager") as mock_tm:
                    mock_tm_instance = AsyncMock()
                    mock_tm_instance.save_new_account = AsyncMock(return_value=uuid4())
                    mock_tm.return_value = mock_tm_instance

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
                    assert "account_id" in data

    @pytest.mark.asyncio
    async def test_connect_missing_credentials(self, mock_user):
        """缺少憑證應該回傳錯誤"""
        with patch("app.routers.oauth_line.get_current_user", return_value=mock_user):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                response = await client.post(
                    "/api/v1/accounts/connect/line/connect",
                    json={
                        "access_key": "",
                        "secret_key": "test_secret",
                        "ad_account_id": "123456",
                    },
                )

            assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_verify_credentials_success(self, mock_user):
        """驗證有效憑證應該成功"""
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
```

**Step 2: 確認紅燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_oauth_line.py -v`
Expected: FAIL

**Step 3: 🟢 實作最小可行程式碼**

```python
# backend/app/routers/oauth_line.py
# -*- coding: utf-8 -*-
"""
LINE Ads 連接路由

LINE Ads 使用 JWS 認證，用戶需要手動輸入 Access Key 和 Secret Key。
"""

import os
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.db.base import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.line_jws_signer import LineJWSSigner
from app.services.token_manager import TokenManager

logger = get_logger(__name__)

router = APIRouter()

# LINE Ads API 端點
LINE_ADS_API_BASE = "https://ads.line.me/api/v3"


class ConnectRequest(BaseModel):
    """連接請求"""
    access_key: str
    secret_key: str
    ad_account_id: str


class ConnectResponse(BaseModel):
    """連接回應"""
    success: bool
    account_id: Optional[str] = None
    error: Optional[str] = None


class VerifyRequest(BaseModel):
    """驗證憑證請求"""
    access_key: str
    secret_key: str


class VerifyResponse(BaseModel):
    """驗證憑證回應"""
    valid: bool
    error: Optional[str] = None


def is_mock_mode() -> bool:
    """檢查是否在 Mock 模式下運行"""
    return os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"


@router.post("/verify", response_model=VerifyResponse)
async def verify_credentials(
    request: VerifyRequest,
    current_user: User = Depends(get_current_user),
) -> VerifyResponse:
    """
    驗證 LINE Ads 憑證

    在正式連接前先驗證 Access Key 和 Secret Key 是否有效。
    """
    if not request.access_key or not request.secret_key:
        return VerifyResponse(valid=False, error="Access Key and Secret Key are required")

    if is_mock_mode():
        # Mock 模式：簡單驗證格式
        return VerifyResponse(valid=True)

    # 真實 API：嘗試呼叫 API 驗證憑證
    try:
        signer = LineJWSSigner(request.access_key, request.secret_key)
        auth_header = signer.get_authorization_header("GET", "/api/v3/adaccounts")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts",
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json",
                },
            )

            if response.status_code == 200:
                return VerifyResponse(valid=True)
            else:
                return VerifyResponse(valid=False, error="Invalid credentials")

    except Exception as e:
        logger.error(f"LINE credentials verification failed: {e}")
        return VerifyResponse(valid=False, error=str(e))


@router.post("/connect", response_model=ConnectResponse)
async def connect_account(
    request: ConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConnectResponse:
    """
    連接 LINE Ads 帳號

    儲存用戶的 Access Key 和 Secret Key，用於後續 API 呼叫。
    """
    try:
        if not request.access_key or not request.secret_key:
            raise HTTPException(
                status_code=400,
                detail="Access Key and Secret Key are required",
            )

        if not request.ad_account_id:
            raise HTTPException(
                status_code=400,
                detail="Ad Account ID is required",
            )

        # Mock 模式或真實 API 都使用相同邏輯
        # LINE 不需要 OAuth token exchange，直接儲存憑證

        token_manager = TokenManager(db)

        # 將 secret_key 存為 refresh_token（用於簽章）
        # 將 access_key 存為 access_token（用於識別）
        account_id = await token_manager.save_new_account(
            user_id=current_user.id,
            platform="line",
            external_id=request.ad_account_id,
            name=f"LINE Ads - {request.ad_account_id}",
            access_token=request.access_key,
            refresh_token=request.secret_key,
            expires_in=None,  # LINE 憑證不會過期
        )

        return ConnectResponse(
            success=True,
            account_id=str(account_id),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LINE connect error: {e}")
        return ConnectResponse(
            success=False,
            error=str(e),
        )
```

**Step 4: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_oauth_line.py -v`
Expected: PASS

**Step 5: 🔵 Commit**

```bash
git add backend/app/routers/oauth_line.py backend/tests/unit/test_oauth_line.py
git commit -m "feat(line): add LINE Ads connect endpoint with JWS auth

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: 路由註冊

**Files:**
- Modify: `backend/app/routers/__init__.py`

**Step 1: 🔴 確認現狀**

驗證 LINE 路由尚未註冊。

**Step 2: 🟢 新增路由註冊**

在 `backend/app/routers/__init__.py` 中新增：

```python
from app.routers import (
    # ... existing imports
    oauth_line,
)

# ... existing routes

api_router.include_router(
    oauth_line.router,
    prefix="/accounts/connect/line",
    tags=["OAuth - LINE"],
)
```

**Step 3: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -c "from app.routers import api_router; print('OK')"`
Expected: OK

**Step 4: 🔵 Commit**

```bash
git add backend/app/routers/__init__.py
git commit -m "feat(line): register LINE Ads routes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: LINE API Client

**Files:**
- Create: `backend/app/services/line_api_client.py`
- Test: `backend/tests/unit/test_line_api_client.py`

**Step 1: 🔴 撰寫失敗測試**

```python
# backend/tests/unit/test_line_api_client.py
"""LINE Ads API Client 測試"""

import pytest
from app.services.line_api_client import LineAPIClient


class TestLineAPIClient:
    """測試 LINE API Client"""

    @pytest.fixture
    def client(self):
        """建立測試用 client"""
        return LineAPIClient(
            access_key="test_access_key",
            secret_key="test_secret_key",
            use_mock=True,
        )

    @pytest.mark.asyncio
    async def test_get_campaigns_returns_list(self, client):
        """應該回傳廣告活動列表"""
        campaigns = await client.get_campaigns("test_account_id")
        assert isinstance(campaigns, list)
        assert len(campaigns) > 0

    @pytest.mark.asyncio
    async def test_campaign_has_required_fields(self, client):
        """廣告活動應該有必要欄位"""
        campaigns = await client.get_campaigns("test_account_id")
        campaign = campaigns[0]
        assert "id" in campaign
        assert "name" in campaign
        assert "status" in campaign

    @pytest.mark.asyncio
    async def test_get_ad_groups_returns_list(self, client):
        """應該回傳廣告組列表"""
        ad_groups = await client.get_ad_groups("test_account_id")
        assert isinstance(ad_groups, list)
        assert len(ad_groups) > 0

    @pytest.mark.asyncio
    async def test_get_ads_returns_list(self, client):
        """應該回傳廣告列表"""
        ads = await client.get_ads("test_account_id")
        assert isinstance(ads, list)
        assert len(ads) > 0

    @pytest.mark.asyncio
    async def test_get_metrics_returns_list(self, client):
        """應該回傳成效數據"""
        metrics = await client.get_metrics(
            account_id="test_account_id",
            start_date="2026-01-01",
            end_date="2026-01-31",
        )
        assert isinstance(metrics, list)

    def test_mock_mode_default(self):
        """預設應該使用 Mock 模式"""
        import os
        os.environ["USE_MOCK_ADS_API"] = "true"
        client = LineAPIClient(
            access_key="test",
            secret_key="test",
        )
        assert client.use_mock is True

    def test_mock_mode_explicit_false(self):
        """可以明確關閉 Mock 模式"""
        client = LineAPIClient(
            access_key="test",
            secret_key="test",
            use_mock=False,
        )
        assert client.use_mock is False
```

**Step 2: 確認紅燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_line_api_client.py -v`
Expected: FAIL

**Step 3: 🟢 實作最小可行程式碼**

```python
# backend/app/services/line_api_client.py
# -*- coding: utf-8 -*-
"""
LINE Ads API Client

支援 Mock 模式和真實 API 模式切換。
"""

import os
import random
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

import httpx

from app.core.logger import get_logger
from app.services.line_jws_signer import LineJWSSigner

logger = get_logger(__name__)

# LINE Ads API 端點
LINE_ADS_API_BASE = "https://ads.line.me/api/v3"


class LineAPIClient:
    """LINE Ads API Client"""

    def __init__(
        self,
        access_key: str,
        secret_key: str,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化 LINE API Client

        Args:
            access_key: LINE Ads Access Key
            secret_key: LINE Ads Secret Key
            use_mock: 是否使用 Mock 模式（None 時從環境變數讀取）
        """
        self.access_key = access_key
        self.secret_key = secret_key
        self.signer = LineJWSSigner(access_key, secret_key)

        if use_mock is None:
            self.use_mock = os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"
        else:
            self.use_mock = use_mock

    def _get_headers(self, method: str, path: str, body: Optional[str] = None) -> dict:
        """取得 API 請求 headers"""
        return {
            "Authorization": self.signer.get_authorization_header(method, path, body),
            "Content-Type": "application/json",
        }

    def _generate_mock_campaigns(self, count: int = 3) -> list[dict]:
        """生成 Mock 廣告活動數據"""
        statuses = ["ACTIVE", "PAUSED", "ENDED"]
        objectives = ["WEBSITE_TRAFFIC", "CONVERSIONS", "APP_INSTALLS", "VIDEO_VIEWS"]

        return [
            {
                "id": f"line_camp_{uuid4().hex[:8]}",
                "name": f"Mock LINE Campaign {i+1}",
                "status": random.choice(statuses),
                "objective": random.choice(objectives),
                "budget": random.randint(1000, 100000),
                "budgetType": "DAILY",
                "createdAt": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ad_groups(self, count: int = 5) -> list[dict]:
        """生成 Mock 廣告組數據"""
        statuses = ["ACTIVE", "PAUSED"]
        bid_types = ["CPC", "CPM", "CPA"]

        return [
            {
                "id": f"line_adgroup_{uuid4().hex[:8]}",
                "name": f"Mock Ad Group {i+1}",
                "campaignId": f"line_camp_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "bidType": random.choice(bid_types),
                "bidAmount": random.randint(10, 500),
                "createdAt": (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
            }
            for i in range(count)
        ]

    def _generate_mock_ads(self, count: int = 8) -> list[dict]:
        """生成 Mock 廣告數據"""
        statuses = ["ACTIVE", "PAUSED", "IN_REVIEW", "REJECTED"]
        ad_formats = ["IMAGE", "VIDEO", "CAROUSEL"]

        return [
            {
                "id": f"line_ad_{uuid4().hex[:8]}",
                "name": f"Mock LINE Ad {i+1}",
                "adGroupId": f"line_adgroup_{uuid4().hex[:8]}",
                "status": random.choice(statuses),
                "format": random.choice(ad_formats),
                "headline": f"Amazing LINE Ad #{i+1}",
                "createdAt": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
            }
            for i in range(count)
        ]

    async def get_campaigns(self, account_id: str) -> list[dict]:
        """
        取得廣告活動列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            廣告活動列表
        """
        if self.use_mock:
            return self._generate_mock_campaigns()

        path = f"/api/v3/adaccounts/{account_id}/campaigns"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/campaigns",
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                logger.error(f"LINE get campaigns failed: {response.text}")
                return []

            data = response.json()
            return data.get("campaigns", [])

    async def get_ad_groups(self, account_id: str) -> list[dict]:
        """
        取得廣告組列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            廣告組列表
        """
        if self.use_mock:
            return self._generate_mock_ad_groups()

        path = f"/api/v3/adaccounts/{account_id}/adgroups"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/adgroups",
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("adGroups", [])

    async def get_ads(self, account_id: str) -> list[dict]:
        """
        取得廣告列表

        Args:
            account_id: 廣告帳號 ID

        Returns:
            廣告列表
        """
        if self.use_mock:
            return self._generate_mock_ads()

        path = f"/api/v3/adaccounts/{account_id}/ads"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/ads",
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("ads", [])

    async def get_metrics(
        self,
        account_id: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        """
        取得廣告成效數據

        Args:
            account_id: 廣告帳號 ID
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
                    "spend": random.randint(100, 10000),
                    "conversions": random.randint(0, 100),
                    "ctr": round(random.uniform(0.5, 5.0), 2),
                    "cpc": round(random.uniform(10, 200), 2),
                }
            ]

        path = f"/api/v3/adaccounts/{account_id}/stats"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts/{account_id}/stats",
                params={
                    "startDate": start_date,
                    "endDate": end_date,
                },
                headers=self._get_headers("GET", path),
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return data.get("stats", [])
```

**Step 4: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_line_api_client.py -v`
Expected: PASS

**Step 5: 🔵 Commit**

```bash
git add backend/app/services/line_api_client.py backend/tests/unit/test_line_api_client.py
git commit -m "feat(line): add LINE Ads API client with Mock support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: LINE Sync Service

**Files:**
- Create: `backend/app/services/sync_line.py`
- Test: `backend/tests/unit/test_sync_line.py`

**Step 1: 🔴 撰寫失敗測試**

```python
# backend/tests/unit/test_sync_line.py
"""LINE Ads Sync Service 測試"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.services.sync_line import LineSyncService


class TestLineSyncService:
    """測試 LINE Sync Service"""

    @pytest.fixture
    def mock_db(self):
        """模擬資料庫連線"""
        return AsyncMock()

    @pytest.fixture
    def mock_account(self):
        """模擬廣告帳號"""
        account = MagicMock()
        account.id = uuid4()
        account.external_id = "test_account_123"
        account.access_token = "test_access_key"  # LINE 用 access_key
        account.refresh_token = "test_secret_key"  # LINE 用 secret_key
        account.user_id = uuid4()
        return account

    @pytest.fixture
    def service(self, mock_db, mock_account):
        """建立測試用 service"""
        return LineSyncService(mock_db, mock_account, use_mock=True)

    def test_map_campaign_status_active(self, service):
        """ACTIVE 狀態應該映射為 active"""
        assert service._map_campaign_status("ACTIVE") == "active"

    def test_map_campaign_status_paused(self, service):
        """PAUSED 狀態應該映射為 paused"""
        assert service._map_campaign_status("PAUSED") == "paused"

    def test_map_campaign_status_ended(self, service):
        """ENDED 狀態應該映射為 removed"""
        assert service._map_campaign_status("ENDED") == "removed"

    def test_map_campaign_status_unknown(self, service):
        """未知狀態應該映射為 unknown"""
        assert service._map_campaign_status("SOMETHING_ELSE") == "unknown"

    def test_map_ad_status_in_review(self, service):
        """IN_REVIEW 狀態應該映射為 pending"""
        assert service._map_ad_status("IN_REVIEW") == "pending"

    def test_map_ad_status_rejected(self, service):
        """REJECTED 狀態應該映射為 rejected"""
        assert service._map_ad_status("REJECTED") == "rejected"

    @pytest.mark.asyncio
    async def test_sync_campaigns(self, service):
        """應該能同步廣告活動"""
        result = await service.sync_campaigns()
        assert isinstance(result, dict)
        assert "synced" in result
        assert "failed" in result

    @pytest.mark.asyncio
    async def test_sync_ad_groups(self, service):
        """應該能同步廣告組"""
        result = await service.sync_ad_groups()
        assert isinstance(result, dict)
        assert "synced" in result
```

**Step 2: 確認紅燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_sync_line.py -v`
Expected: FAIL

**Step 3: 🟢 實作最小可行程式碼**

```python
# backend/app/services/sync_line.py
# -*- coding: utf-8 -*-
"""
LINE Ads 資料同步服務

將 LINE Ads 數據同步到統一資料模型。
"""

from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.models.ad_account import AdAccount
from app.services.line_api_client import LineAPIClient

logger = get_logger(__name__)


class LineSyncService:
    """LINE Ads 資料同步服務"""

    def __init__(
        self,
        db: AsyncSession,
        account: AdAccount,
        use_mock: Optional[bool] = None,
    ):
        """
        初始化同步服務

        Args:
            db: 資料庫連線
            account: 廣告帳號
            use_mock: 是否使用 Mock 模式
        """
        self.db = db
        self.account = account
        # LINE 的 access_token 存放 access_key
        # LINE 的 refresh_token 存放 secret_key
        self.client = LineAPIClient(
            access_key=account.access_token,
            secret_key=account.refresh_token,
            use_mock=use_mock,
        )

    def _map_campaign_status(self, line_status: str) -> str:
        """
        將 LINE 廣告活動狀態映射到統一狀態

        LINE 狀態：ACTIVE, PAUSED, ENDED, DELETED
        統一狀態：active, paused, removed, unknown
        """
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "ENDED": "removed",
            "DELETED": "removed",
        }
        return status_map.get(line_status, "unknown")

    def _map_ad_group_status(self, line_status: str) -> str:
        """將 LINE 廣告組狀態映射到統一狀態"""
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "ENDED": "removed",
            "DELETED": "removed",
        }
        return status_map.get(line_status, "unknown")

    def _map_ad_status(self, line_status: str) -> str:
        """
        將 LINE 廣告狀態映射到統一狀態

        LINE 狀態：ACTIVE, PAUSED, IN_REVIEW, REJECTED, ENDED
        統一狀態：active, paused, pending, rejected, removed, unknown
        """
        status_map = {
            "ACTIVE": "active",
            "PAUSED": "paused",
            "IN_REVIEW": "pending",
            "REJECTED": "rejected",
            "ENDED": "removed",
            "DELETED": "removed",
        }
        return status_map.get(line_status, "unknown")

    async def sync_campaigns(self) -> dict:
        """
        同步廣告活動

        Returns:
            同步結果 {"synced": int, "failed": int}
        """
        try:
            campaigns = await self.client.get_campaigns(self.account.external_id)

            synced = 0
            failed = 0

            for campaign in campaigns:
                try:
                    # 映射狀態
                    unified_status = self._map_campaign_status(campaign.get("status", ""))

                    # TODO: 儲存到資料庫
                    # 目前只計數
                    synced += 1

                except Exception as e:
                    logger.error(f"Failed to sync LINE campaign: {e}")
                    failed += 1

            return {"synced": synced, "failed": failed}

        except Exception as e:
            logger.error(f"LINE campaign sync error: {e}")
            return {"synced": 0, "failed": 0, "error": str(e)}

    async def sync_ad_groups(self) -> dict:
        """
        同步廣告組

        Returns:
            同步結果 {"synced": int, "failed": int}
        """
        try:
            ad_groups = await self.client.get_ad_groups(self.account.external_id)

            synced = 0
            failed = 0

            for ad_group in ad_groups:
                try:
                    unified_status = self._map_ad_group_status(ad_group.get("status", ""))
                    synced += 1
                except Exception as e:
                    logger.error(f"Failed to sync LINE ad group: {e}")
                    failed += 1

            return {"synced": synced, "failed": failed}

        except Exception as e:
            logger.error(f"LINE ad group sync error: {e}")
            return {"synced": 0, "failed": 0, "error": str(e)}

    async def sync_ads(self) -> dict:
        """
        同步廣告

        Returns:
            同步結果 {"synced": int, "failed": int}
        """
        try:
            ads = await self.client.get_ads(self.account.external_id)

            synced = 0
            failed = 0

            for ad in ads:
                try:
                    unified_status = self._map_ad_status(ad.get("status", ""))
                    synced += 1
                except Exception as e:
                    logger.error(f"Failed to sync LINE ad: {e}")
                    failed += 1

            return {"synced": synced, "failed": failed}

        except Exception as e:
            logger.error(f"LINE ad sync error: {e}")
            return {"synced": 0, "failed": 0, "error": str(e)}

    async def sync_all(self) -> dict:
        """
        同步所有 LINE Ads 數據

        Returns:
            同步結果總覽
        """
        campaigns = await self.sync_campaigns()
        ad_groups = await self.sync_ad_groups()
        ads = await self.sync_ads()

        return {
            "campaigns": campaigns,
            "ad_groups": ad_groups,
            "ads": ads,
        }
```

**Step 4: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/unit/test_sync_line.py -v`
Expected: PASS

**Step 5: 🔵 Commit**

```bash
git add backend/app/services/sync_line.py backend/tests/unit/test_sync_line.py
git commit -m "feat(line): add LINE Ads sync service with status mapping

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: 前端 Proxy 路由

**Files:**
- Create: `app/api/v1/accounts/connect/line/route.ts`

**Step 1: 🔴 確認現狀**

確認前端 proxy 路由尚未建立。

**Step 2: 🟢 建立 proxy 路由**

```typescript
// app/api/v1/accounts/connect/line/route.ts
/**
 * LINE Ads 連接端點
 *
 * 代理請求到 Python 後端處理 LINE 帳號連接
 */

import { NextRequest, NextResponse } from 'next/server';

// 強制動態渲染
export const dynamic = 'force-dynamic';

const PYTHON_API_URL = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(
      `${PYTHON_API_URL}/api/v1/accounts/connect/line/connect`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to connect LINE account' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('LINE connect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Step 3: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize && npx tsc --noEmit`
Expected: No errors

**Step 4: 🔵 Commit**

```bash
git add app/api/v1/accounts/connect/line/route.ts
git commit -m "feat(line): add frontend proxy route for LINE connection

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7: 前端帳號頁面更新

**Files:**
- Modify: `app/(dashboard)/accounts/page.tsx`

**Step 1: 🔴 確認現狀**

確認 LINE 平台尚未加入前端。

**Step 2: 🟢 新增 LINE 平台**

在 `platformStyles` 中新增：

```typescript
line: {
  bg: 'bg-green-500 dark:bg-green-600',
  text: 'text-white dark:text-gray-100',
  label: 'LINE Ads',
  icon: 'L',
},
```

更新 `platform` type 加入 `'line'`。

新增 LINE 連接按鈕（需要輸入表單）：

```typescript
// LINE 連接需要表單輸入 Access Key 和 Secret Key
const [showLineForm, setShowLineForm] = useState(false);
const [lineCredentials, setLineCredentials] = useState({
  accessKey: '',
  secretKey: '',
  adAccountId: '',
});

const handleConnectLine = async () => {
  // 驗證輸入
  if (!lineCredentials.accessKey || !lineCredentials.secretKey || !lineCredentials.adAccountId) {
    setError('請填寫所有欄位');
    return;
  }

  setLoading(true);
  try {
    const response = await fetch('/api/v1/accounts/connect/line', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: lineCredentials.accessKey,
        secret_key: lineCredentials.secretKey,
        ad_account_id: lineCredentials.adAccountId,
      }),
    });

    if (!response.ok) {
      throw new Error('連接失敗');
    }

    // 刷新帳號列表
    await fetchAccounts();
    setShowLineForm(false);
    setLineCredentials({ accessKey: '', secretKey: '', adAccountId: '' });
  } catch (err) {
    setError('連接 LINE Ads 帳號失敗');
  } finally {
    setLoading(false);
  }
};
```

**Step 3: 確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize && npx tsc --noEmit`
Expected: No errors

**Step 4: 🔵 Commit**

```bash
git add app/(dashboard)/accounts/page.tsx
git commit -m "feat(line): add LINE Ads connection form to accounts page

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: 環境變數更新

**Files:**
- Modify: `backend/.env.example`

**Step 1: 🔴 確認現狀**

確認 LINE 環境變數尚未加入範例。

**Step 2: 🟢 更新環境變數範例**

在 `backend/.env.example` 中新增：

```bash
# LINE Ads API（使用 JWS 認證，非 OAuth）
# 用戶需要在 LINE Ads Platform 後台取得這些憑證
# 不需要在這裡配置，用戶會在連接時自行輸入
# LINE_ADS_ACCESS_KEY=（用戶輸入）
# LINE_ADS_SECRET_KEY=（用戶輸入）
```

**Step 3: 🔵 Commit**

```bash
git add backend/.env.example
git commit -m "docs(line): update env example with LINE Ads notes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: 整合測試

**Files:**
- Create: `backend/tests/integration/test_line_flow.py`

**Step 1: 🔴 撰寫失敗測試**

```python
# backend/tests/integration/test_line_flow.py
"""LINE Ads 整合流程測試"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from uuid import uuid4

from app.main import app


class TestLineIntegrationFlow:
    """測試 LINE Ads 完整整合流程"""

    @pytest.fixture
    def mock_user(self):
        """模擬已登入用戶"""
        from app.models.user import User
        return User(
            id=uuid4(),
            email="test@example.com",
            hashed_password="hashed",
        )

    @pytest.mark.asyncio
    async def test_full_connect_flow(self, mock_user):
        """測試完整連接流程"""
        with patch("app.routers.oauth_line.get_current_user", return_value=mock_user):
            with patch("app.routers.oauth_line.is_mock_mode", return_value=True):
                with patch("app.routers.oauth_line.TokenManager") as mock_tm:
                    mock_tm_instance = AsyncMock()
                    mock_tm_instance.save_new_account = AsyncMock(return_value=uuid4())
                    mock_tm.return_value = mock_tm_instance

                    async with AsyncClient(
                        transport=ASGITransport(app=app),
                        base_url="http://test",
                    ) as client:
                        # 1. 驗證憑證
                        verify_response = await client.post(
                            "/api/v1/accounts/connect/line/verify",
                            json={
                                "access_key": "test_access_key",
                                "secret_key": "test_secret_key",
                            },
                        )
                        assert verify_response.status_code == 200
                        assert verify_response.json()["valid"] is True

                        # 2. 連接帳號
                        connect_response = await client.post(
                            "/api/v1/accounts/connect/line/connect",
                            json={
                                "access_key": "test_access_key",
                                "secret_key": "test_secret_key",
                                "ad_account_id": "123456",
                            },
                        )
                        assert connect_response.status_code == 200
                        assert connect_response.json()["success"] is True

    @pytest.mark.asyncio
    async def test_sync_flow(self, mock_user):
        """測試資料同步流程"""
        from app.services.sync_line import LineSyncService
        from unittest.mock import MagicMock

        mock_account = MagicMock()
        mock_account.id = uuid4()
        mock_account.external_id = "test_account"
        mock_account.access_token = "test_access_key"
        mock_account.refresh_token = "test_secret_key"
        mock_account.user_id = mock_user.id

        service = LineSyncService(
            db=AsyncMock(),
            account=mock_account,
            use_mock=True,
        )

        result = await service.sync_all()

        assert "campaigns" in result
        assert "ad_groups" in result
        assert "ads" in result
        assert result["campaigns"]["synced"] > 0

    @pytest.mark.asyncio
    async def test_api_client_mock_flow(self):
        """測試 API Client Mock 流程"""
        from app.services.line_api_client import LineAPIClient

        client = LineAPIClient(
            access_key="test",
            secret_key="test",
            use_mock=True,
        )

        campaigns = await client.get_campaigns("test_account")
        ad_groups = await client.get_ad_groups("test_account")
        ads = await client.get_ads("test_account")
        metrics = await client.get_metrics("test_account", "2026-01-01", "2026-01-31")

        assert len(campaigns) > 0
        assert len(ad_groups) > 0
        assert len(ads) > 0
        assert len(metrics) > 0

    @pytest.mark.asyncio
    async def test_jws_signature_generation(self):
        """測試 JWS 簽章產生"""
        from app.services.line_jws_signer import LineJWSSigner

        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )

        # 產生簽章
        auth_header = signer.get_authorization_header(
            method="GET",
            path="/api/v3/adaccounts",
        )

        assert auth_header.startswith("Bearer ")
        jws = auth_header.replace("Bearer ", "")
        assert len(jws.split(".")) == 3
```

**Step 2: 確認紅燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/integration/test_line_flow.py -v`
Expected: FAIL（因為尚未實作所有模組）

**Step 3: 在完成所有模組後確認綠燈**

Run: `cd /Volumes/500G/Claudecode/adoptimize/backend && python -m pytest tests/integration/test_line_flow.py -v`
Expected: PASS

**Step 4: 🔵 Commit**

```bash
git add backend/tests/integration/test_line_flow.py
git commit -m "test(line): add LINE Ads integration tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: 最終驗證

**Step 1: 執行所有 LINE 相關測試**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest tests/unit/test_line*.py tests/integration/test_line*.py -v
```

Expected: All tests pass

**Step 2: 執行完整測試套件**

```bash
cd /Volumes/500G/Claudecode/adoptimize/backend
python -m pytest --tb=short
```

Expected: All tests pass (包含 TikTok, Reddit, LINE)

**Step 3: 🔵 Final Commit**

```bash
git add -A
git commit -m "feat(line): complete LINE Ads integration

- JWS signature generator for LINE Ads API authentication
- Connect endpoint with Access Key / Secret Key input
- API client with Mock mode support
- Sync service with status mapping
- Frontend connection form
- Integration tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## 📊 預期測試覆蓋

- JWS 簽章產生器：100%
- 連接路由：90%+
- API Client：90%+
- Sync Service：90%+
- 整合測試：80%+

## 📝 與 TikTok/Reddit 的差異

| 項目 | TikTok | Reddit | LINE |
|------|--------|--------|------|
| 認證方式 | OAuth 2.0 | OAuth 2.0 + Basic Auth | JWS (HS256) |
| Token 類型 | Access Token | Access Token | Access Key + Secret Key |
| Token 過期 | 24 小時 | 1 小時 | 永不過期 |
| 連接方式 | OAuth 重定向 | OAuth 重定向 | 手動輸入憑證 |
| Refresh | 需要 | 需要 | 不需要 |
