# -*- coding: utf-8 -*-
"""
Meta Marketing API OAuth 路由

實作 Meta (Facebook) OAuth 2.0 授權流程：
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

# Meta OAuth 端點
META_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
META_GRAPH_URL = "https://graph.facebook.com/v18.0"

# Meta Marketing API 所需的權限
META_PERMISSIONS = [
    "ads_management",
    "ads_read",
    "business_management",
    "read_insights",
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
    ad_accounts: Optional[list[dict]] = None
    audit_task_ids: Optional[list[str]] = None
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
    使用授權碼交換 access token

    Args:
        code: OAuth 授權碼
        redirect_uri: 重定向 URI
        settings: 應用程式設定

    Returns:
        包含 access_token 和 expires_in 的字典
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            META_TOKEN_URL,
            params={
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Token exchange failed: {response.text}",
            )

        return response.json()


async def get_long_lived_token(
    short_lived_token: str,
    settings: Settings,
) -> dict:
    """
    將短期 token 換成長期 token

    Meta 的短期 token 有效期約 1-2 小時，
    長期 token 有效期約 60 天。

    Args:
        short_lived_token: 短期 access token
        settings: 應用程式設定

    Returns:
        包含長期 access_token 和 expires_in 的字典
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            META_TOKEN_URL,
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.META_APP_ID,
                "client_secret": settings.META_APP_SECRET,
                "fb_exchange_token": short_lived_token,
            },
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Long-lived token exchange failed: {response.text}",
            )

        return response.json()


async def get_meta_ad_accounts(access_token: str) -> list[dict]:
    """
    取得使用者可存取的 Meta 廣告帳戶

    Args:
        access_token: OAuth access token

    Returns:
        廣告帳戶列表，每個帳戶包含 id, name, account_status 等資訊
    """
    async with httpx.AsyncClient() as client:
        # 先取得用戶資訊
        me_response = await client.get(
            f"{META_GRAPH_URL}/me",
            params={
                "access_token": access_token,
                "fields": "id,name",
            },
        )

        if me_response.status_code != 200:
            return []

        # 取得用戶可存取的廣告帳戶
        accounts_response = await client.get(
            f"{META_GRAPH_URL}/me/adaccounts",
            params={
                "access_token": access_token,
                "fields": "id,name,account_status,currency,timezone_name",
            },
        )

        if accounts_response.status_code != 200:
            return []

        data = accounts_response.json()
        return data.get("data", [])


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
        refresh_token: OAuth refresh token (Meta 不使用)
        expires_in: Token 有效秒數

    Returns:
        新建立的帳戶 ID
    """
    # TODO: 實作實際的資料庫儲存
    return uuid.uuid4()


# API 端點
@router.get("/auth", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    settings: Settings = Depends(get_settings),
) -> AuthUrlResponse:
    """
    產生 Meta OAuth 授權 URL

    用戶需要訪問此 URL 進行 Facebook 帳號授權，
    授權完成後會重定向到 redirect_uri。
    """
    if not settings.META_APP_ID:
        raise HTTPException(
            status_code=500,
            detail="Meta App ID not configured",
        )

    # 產生 state 用於 CSRF 保護
    state = uuid.uuid4().hex

    # 建構授權 URL 參數
    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": ",".join(META_PERMISSIONS),
        "state": state,
    }

    auth_url = f"{META_AUTH_URL}?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url, state=state)


@router.get("/callback", response_model=CallbackResponse)
async def oauth_callback(
    code: str = Query(..., description="OAuth 授權碼"),
    state: str = Query(..., description="CSRF 保護 state"),
    redirect_uri: str = Query(
        "http://localhost:3000/api/v1/accounts/callback/meta",
        description="原始重定向 URI",
    ),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """
    處理 Meta OAuth 回調

    交換授權碼取得 tokens，並儲存帳戶資訊。
    """
    try:
        # 交換授權碼取得短期 token
        tokens = await exchange_code_for_tokens(code, redirect_uri, settings)

        short_lived_token = tokens.get("access_token")

        if not short_lived_token:
            return CallbackResponse(
                success=False,
                error="No access token received",
            )

        # 換取長期 token
        long_lived_tokens = await get_long_lived_token(short_lived_token, settings)
        access_token = long_lived_tokens.get("access_token", short_lived_token)
        expires_in = long_lived_tokens.get("expires_in", 5184000)  # 60 days

        # 取得可存取的廣告帳戶
        ad_accounts = await get_meta_ad_accounts(access_token)

        if not ad_accounts:
            return CallbackResponse(
                success=False,
                error="No ad accounts found",
            )

        # 儲存每個廣告帳戶
        # TODO: 從 session 取得實際的 user_id
        user_id = uuid.uuid4()
        saved_account_ids = []
        audit_task_ids = []

        for account in ad_accounts:
            account_id = await save_ad_account(
                user_id=user_id,
                platform="meta",
                external_id=account.get("id", "unknown"),
                name=account.get("name", "Meta Ads Account"),
                access_token=access_token,
                refresh_token="",  # Meta 不使用 refresh token
                expires_in=expires_in,
            )
            saved_account_ids.append(str(account_id))

            # 觸發健檢任務（背景執行）
            audit_task = run_health_audit.delay(str(account_id))
            audit_task_ids.append(audit_task.id)

        return CallbackResponse(
            success=True,
            account_id=saved_account_ids[0] if saved_account_ids else None,
            ad_accounts=ad_accounts,
            audit_task_ids=audit_task_ids,
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
    刷新 Meta OAuth Token

    Meta 的長期 token 在過期前無法刷新，
    需要用戶重新授權。此端點會嘗試延長 token 有效期。
    """
    # TODO: 實作 token 刷新邏輯
    # Meta 長期 token 可以在過期前 60 天內延長
    raise HTTPException(
        status_code=404,
        detail="Account not found",
    )
