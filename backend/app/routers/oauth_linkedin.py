# -*- coding: utf-8 -*-
"""
LinkedIn Ads OAuth 路由

實作 LinkedIn OAuth 2.0 授權流程：
1. 產生授權 URL
2. 處理 OAuth 回調
3. 刷新 Token
"""

import os
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.config import get_settings, Settings
from app.core.logger import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.csrf_protection import generate_oauth_state

logger = get_logger(__name__)

router = APIRouter()

# LinkedIn OAuth 端點
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"

# LinkedIn Marketing API 所需的權限
# 參考: https://learn.microsoft.com/en-us/linkedin/marketing/getting-started
LINKEDIN_SCOPES = [
    "r_ads",           # 讀取廣告帳戶
    "rw_ads",          # 讀寫廣告
    "r_basicprofile",  # 讀取基本資料（已棄用，但某些應用仍需要）
    "r_organization_admin",  # 讀取組織管理權限
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


def is_mock_mode() -> bool:
    """檢查是否在 Mock 模式下運行"""
    return os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"


# API 端點
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

    # 產生 state，包含 user_id 和 nonce 用於回調時識別用戶並防止 CSRF
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
