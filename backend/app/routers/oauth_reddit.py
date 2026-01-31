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
    "ads",
    "adsread",
    "adsedit",
    "identity",
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
        "duration": "permanent",
        "scope": " ".join(REDDIT_SCOPES),
    }

    auth_url = f"{REDDIT_AUTH_URL}?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url, state=state)


async def exchange_code_for_tokens(
    code: str,
    redirect_uri: str,
    settings: Settings,
) -> dict:
    """
    使用授權碼交換 access token 和 refresh token

    Reddit 使用 Basic Auth (client_id:secret) 進行認證
    """
    # Mock 模式
    if is_mock_mode():
        return {
            "access_token": f"mock_reddit_access_{code[:8]}",
            "refresh_token": f"mock_reddit_refresh_{code[:8]}",
            "expires_in": 3600,
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
    """處理 Reddit OAuth 回調"""
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

        if account.user_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to refresh this account's token",
            )

        if account.platform != "reddit":
            raise HTTPException(
                status_code=400,
                detail="This endpoint only supports Reddit accounts",
            )

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
