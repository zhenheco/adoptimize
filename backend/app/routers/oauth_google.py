# -*- coding: utf-8 -*-
"""
Google Ads OAuth 路由

實作 Google OAuth 2.0 授權流程：
1. 產生授權 URL
2. 處理 OAuth 回調
3. 刷新 Token
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.config import get_settings, Settings
from app.workers.run_health_audit import run_health_audit

router = APIRouter()

# Google OAuth 端點
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords"


# Pydantic 模型
class AuthUrlResponse(BaseModel):
    """授權 URL 回應"""
    auth_url: str
    state: str


class CallbackResponse(BaseModel):
    """OAuth 回調回應"""
    success: bool
    account_id: Optional[str] = None
    customer_ids: Optional[list[str]] = None
    audit_task_id: Optional[str] = None
    error: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """刷新 Token 請求"""
    account_id: str


class RefreshTokenResponse(BaseModel):
    """刷新 Token 回應"""
    success: bool
    error: Optional[str] = None


# 輔助函數
async def exchange_code_for_tokens(
    code: str,
    redirect_uri: str,
    settings: Settings,
) -> dict:
    """
    使用授權碼交換 access token 和 refresh token

    Args:
        code: OAuth 授權碼
        redirect_uri: 重定向 URI
        settings: 應用程式設定

    Returns:
        包含 access_token, refresh_token, expires_in 的字典
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_ADS_CLIENT_ID,
                "client_secret": settings.GOOGLE_ADS_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Token exchange failed: {response.text}",
            )

        return response.json()


async def get_google_ads_customer_ids(access_token: str) -> list[str]:
    """
    取得使用者可存取的 Google Ads 客戶帳號 ID

    Args:
        access_token: OAuth access token

    Returns:
        客戶帳號 ID 列表
    """
    # 使用 Google Ads API 的 customerService.listAccessibleCustomers
    # 這裡需要使用 google-ads SDK，先返回空列表
    # TODO: 實作實際的 API 呼叫
    return []


async def refresh_access_token(
    refresh_token: str,
    settings: Settings,
) -> dict:
    """
    使用 refresh token 取得新的 access token

    Args:
        refresh_token: OAuth refresh token
        settings: 應用程式設定

    Returns:
        包含新 access_token 和 expires_in 的字典
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "refresh_token": refresh_token,
                "client_id": settings.GOOGLE_ADS_CLIENT_ID,
                "client_secret": settings.GOOGLE_ADS_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Token refresh failed: {response.text}",
            )

        return response.json()


async def save_ad_account(
    user_id: uuid.UUID,
    platform: str,
    external_id: str,
    name: str,
    access_token: str,
    refresh_token: str,
    expires_in: int,
) -> uuid.UUID:
    """
    儲存廣告帳戶資訊到資料庫

    Args:
        user_id: 用戶 ID
        platform: 平台名稱
        external_id: 平台帳戶 ID
        name: 帳戶名稱
        access_token: OAuth access token
        refresh_token: OAuth refresh token
        expires_in: Token 有效秒數

    Returns:
        新建立的帳戶 ID
    """
    # TODO: 實作實際的資料庫儲存
    # 這裡需要使用 SQLAlchemy async session
    return uuid.uuid4()


# API 端點
@router.get("/auth", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    settings: Settings = Depends(get_settings),
) -> AuthUrlResponse:
    """
    產生 Google OAuth 授權 URL

    用戶需要訪問此 URL 進行 Google 帳號授權，
    授權完成後會重定向到 redirect_uri。
    """
    if not settings.GOOGLE_ADS_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google Ads client ID not configured",
        )

    # 產生 state 用於 CSRF 保護
    state = uuid.uuid4().hex

    # 建構授權 URL 參數
    params = {
        "client_id": settings.GOOGLE_ADS_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_ADS_SCOPE,
        "access_type": "offline",  # 取得 refresh token
        "prompt": "consent",  # 強制顯示同意頁面以取得 refresh token
        "state": state,
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url, state=state)


@router.get("/callback", response_model=CallbackResponse)
async def oauth_callback(
    code: str = Query(..., description="OAuth 授權碼"),
    state: str = Query(..., description="CSRF 保護 state"),
    redirect_uri: str = Query(
        "http://localhost:3000/api/v1/accounts/callback/google",
        description="原始重定向 URI",
    ),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """
    處理 Google OAuth 回調

    交換授權碼取得 tokens，並儲存帳戶資訊。
    """
    try:
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

        # 取得可存取的客戶帳號
        customer_ids = await get_google_ads_customer_ids(access_token)

        # 儲存帳戶資訊
        # TODO: 從 session 取得實際的 user_id
        user_id = uuid.uuid4()

        account_id = await save_ad_account(
            user_id=user_id,
            platform="google",
            external_id=customer_ids[0] if customer_ids else "unknown",
            name="Google Ads Account",
            access_token=access_token,
            refresh_token=refresh_token or "",
            expires_in=expires_in,
        )

        # 觸發健檢任務（背景執行）
        audit_task = run_health_audit.delay(str(account_id))

        return CallbackResponse(
            success=True,
            account_id=str(account_id),
            customer_ids=customer_ids,
            audit_task_id=audit_task.id,
        )

    except HTTPException:
        raise
    except Exception as e:
        return CallbackResponse(
            success=False,
            error=str(e),
        )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    settings: Settings = Depends(get_settings),
) -> RefreshTokenResponse:
    """
    刷新 Google OAuth Token

    使用 refresh token 取得新的 access token。
    """
    # TODO: 從資料庫取得帳戶的 refresh token
    # 這裡暫時返回 404
    raise HTTPException(
        status_code=404,
        detail="Account not found",
    )
