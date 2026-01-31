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
