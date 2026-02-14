# -*- coding: utf-8 -*-
"""
Pinterest Ads OAuth 路由

實作 Pinterest OAuth 2.0 授權流程：
1. 產生授權 URL
2. 處理 OAuth 回調
3. 刷新 Token

Pinterest OAuth 特點：
- Authorization URL: https://www.pinterest.com/oauth/
- Token URL: https://api.pinterest.com/v5/oauth/token
- 使用 Basic Auth（client_id:client_secret）交換 token
- Access Token 有效期 30 天，支援 refresh token
"""

import base64
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
from app.core.mock_mode import is_mock_mode
from app.services.csrf_protection import generate_oauth_state, verify_oauth_state
from app.services.token_manager import TokenManager

logger = get_logger(__name__)

router = APIRouter()

# Pinterest OAuth 端點
PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/"
PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"

# Pinterest Ads API 所需的權限
PINTEREST_SCOPES = [
    "ads:read",              # 讀取廣告數據
    "user_accounts:read",    # 讀取使用者帳號資訊
    "boards:read",           # 讀取看板（用於素材分析）
    "pins:read",             # 讀取 Pin（用於素材分析）
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


def _get_basic_auth_header(settings: Settings) -> str:
    """
    產生 Pinterest API 所需的 Basic Auth header

    Pinterest 使用 client_id:client_secret 的 Base64 編碼
    """
    credentials = f"{settings.PINTEREST_APP_ID}:{settings.PINTEREST_APP_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


# API 端點
@router.get("/auth", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AuthUrlResponse:
    """
    產生 Pinterest OAuth 授權 URL

    用戶需要訪問此 URL 進行 Pinterest 帳號授權，
    授權完成後會重定向到 redirect_uri。
    """
    if not settings.PINTEREST_APP_ID:
        raise HTTPException(
            status_code=500,
            detail="Pinterest App ID not configured",
        )

    # 產生 state，包含 user_id 和 nonce 用於回調時識別用戶並防止 CSRF
    state = await generate_oauth_state(current_user.id, "pinterest")

    # 建構授權 URL 參數
    params = {
        "client_id": settings.PINTEREST_APP_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": ",".join(PINTEREST_SCOPES),
        "state": state,
    }

    auth_url = f"{PINTEREST_AUTH_URL}?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url, state=state)


async def exchange_code_for_tokens(
    code: str,
    redirect_uri: str,
    settings: Settings,
) -> dict:
    """
    使用授權碼交換 access token 和 refresh token

    Pinterest 使用 Basic Auth + POST body 交換 token

    Args:
        code: Pinterest OAuth 授權碼
        redirect_uri: OAuth 回調 URI
        settings: 應用程式設定

    Returns:
        包含 token 資訊的字典
    """
    # Mock 模式
    if is_mock_mode("pinterest"):
        return {
            "access_token": f"mock_pinterest_access_{code[:8]}",
            "refresh_token": f"mock_pinterest_refresh_{code[:8]}",
            "expires_in": 2592000,  # 30 天
            "scope": ",".join(PINTEREST_SCOPES),
        }

    # 真實 API 呼叫
    async with httpx.AsyncClient() as client:
        response = await client.post(
            PINTEREST_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={
                "Authorization": _get_basic_auth_header(settings),
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )

        if response.status_code != 200:
            logger.error(f"Pinterest token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token exchange failed",
            )

        data = response.json()
        return {
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "expires_in": data.get("expires_in", 2592000),
            "scope": data.get("scope", ""),
        }


@router.get("/callback", response_model=CallbackResponse)
async def oauth_callback(
    code: Optional[str] = Query(None, description="Pinterest OAuth 授權碼"),
    state: str = Query(..., description="CSRF 保護 state"),
    error: Optional[str] = Query(None, description="錯誤類型"),
    error_description: Optional[str] = Query(None, description="錯誤描述"),
    redirect_uri: str = Query(
        "http://localhost:3000/api/v1/accounts/callback/pinterest",
        description="原始重定向 URI",
    ),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """
    處理 Pinterest OAuth 回調

    此端點由 Pinterest OAuth 授權頁面重定向回來，
    負責交換授權碼取得 access token 並儲存帳戶資訊。
    """
    try:
        # 處理授權錯誤
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

        # 驗證 state 並取得 user_id
        is_valid, user_id, error_msg = await verify_oauth_state(state, "pinterest")
        if not is_valid or not user_id:
            return CallbackResponse(
                success=False,
                error=error_msg or "Invalid state parameter",
            )

        # 交換授權碼取得 tokens
        tokens = await exchange_code_for_tokens(code, redirect_uri, settings)

        # 使用 TokenManager 儲存帳戶到資料庫
        token_manager = TokenManager(db)
        external_id = f"pinterest_user_{user_id.hex[:8]}"

        account_id, is_new, save_error = await token_manager.save_or_update_account(
            user_id=user_id,
            platform="pinterest",
            external_id=external_id,
            name=f"Pinterest Ads - {external_id}",
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=tokens["expires_in"],
        )

        if save_error:
            return CallbackResponse(
                success=False,
                error=save_error,
            )

        return CallbackResponse(
            success=True,
            account_id=str(account_id),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pinterest OAuth callback error: {e}")
        return CallbackResponse(success=False, error=str(e))


async def refresh_access_token(
    refresh_token: str,
    settings: Settings,
) -> dict:
    """
    使用 refresh token 取得新的 access token

    Args:
        refresh_token: Pinterest OAuth refresh token
        settings: 應用程式設定

    Returns:
        包含新 token 資訊的字典
    """
    # Mock 模式
    if is_mock_mode("pinterest"):
        return {
            "access_token": f"mock_pinterest_refreshed_{refresh_token[:8]}",
            "refresh_token": f"mock_pinterest_new_refresh_{refresh_token[:8]}",
            "expires_in": 2592000,  # 30 天
            "scope": ",".join(PINTEREST_SCOPES),
        }

    # 真實 API 呼叫
    async with httpx.AsyncClient() as client:
        response = await client.post(
            PINTEREST_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            headers={
                "Authorization": _get_basic_auth_header(settings),
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )

        if response.status_code != 200:
            logger.error(f"Pinterest token refresh failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token refresh failed",
            )

        data = response.json()
        return {
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token", refresh_token),
            "expires_in": data.get("expires_in", 2592000),
            "scope": data.get("scope", ""),
        }


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token_endpoint(
    request: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RefreshTokenResponse:
    """
    刷新 Pinterest access token

    Pinterest token 有效期 30 天，此端點可用於提前刷新 token。
    """
    try:
        token_manager = TokenManager(db)

        # 取得帳戶
        account = await token_manager.get_account(UUID(request.account_id))

        if not account:
            return RefreshTokenResponse(
                success=False,
                error="Account not found",
            )

        # 驗證帳戶屬於當前用戶
        if account.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to refresh this account's token",
            )

        # 驗證是 Pinterest 帳戶
        if account.platform != "pinterest":
            return RefreshTokenResponse(
                success=False,
                error="Account is not a Pinterest account",
            )

        # 刷新 token
        tokens = await refresh_access_token(
            refresh_token=account.refresh_token,
            settings=settings,
        )

        # 更新帳戶 tokens
        await token_manager.update_tokens(
            account_id=UUID(request.account_id),
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=tokens["expires_in"],
        )

        return RefreshTokenResponse(success=True)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pinterest token refresh error: {e}")
        return RefreshTokenResponse(success=False, error=str(e))
