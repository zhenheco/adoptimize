# -*- coding: utf-8 -*-
"""
TikTok Ads OAuth 路由

實作 TikTok OAuth 2.0 授權流程：
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


# 檢查是否使用 Mock API
def is_mock_mode() -> bool:
    """檢查是否在 Mock 模式下運行"""
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
        包含 token 資訊的字典
    """
    # Mock 模式
    if is_mock_mode():
        return {
            "access_token": f"mock_tiktok_access_{auth_code[:8]}",
            "refresh_token": f"mock_tiktok_refresh_{auth_code[:8]}",
            "expires_in": 86400,
            "refresh_expires_in": 31536000,
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

    此端點由 TikTok OAuth 授權頁面重定向回來，
    負責交換授權碼取得 access token 並儲存帳戶資訊。
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

        # 使用 TokenManager 儲存帳戶到資料庫
        token_manager = TokenManager(db)
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
