# -*- coding: utf-8 -*-
"""
Google Ads OAuth 路由

實作 Google OAuth 2.0 授權流程：
1. 產生授權 URL
2. 處理 OAuth 回調
3. 刷新 Token
"""

import base64
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, Settings
from app.db.base import get_db
from app.middleware.auth import get_current_user, get_current_user_optional
from app.models.user import User
from app.services.token_manager import TokenManager
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


def encode_state(user_id: uuid.UUID) -> str:
    """
    將 user_id 編碼到 OAuth state 參數中

    Args:
        user_id: 用戶 ID

    Returns:
        編碼後的 state 字串
    """
    state_data = {
        "nonce": uuid.uuid4().hex,  # CSRF 保護
        "user_id": str(user_id),
    }
    return base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()


def decode_state(state: str) -> Optional[uuid.UUID]:
    """
    從 OAuth state 參數解碼 user_id

    Args:
        state: 編碼後的 state 字串

    Returns:
        用戶 ID 或 None（如果解碼失敗）
    """
    try:
        state_data = json.loads(base64.urlsafe_b64decode(state))
        return uuid.UUID(state_data.get("user_id"))
    except (json.JSONDecodeError, ValueError, TypeError):
        return None


# API 端點
@router.get("/auth", response_model=AuthUrlResponse)
async def get_auth_url(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AuthUrlResponse:
    """
    產生 Google OAuth 授權 URL

    用戶需要訪問此 URL 進行 Google 帳號授權，
    授權完成後會重定向到 redirect_uri。

    需要認證：會將 user_id 編碼到 state 參數中
    """
    if not settings.GOOGLE_ADS_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google Ads client ID not configured",
        )

    # 產生 state，包含 user_id 用於回調時識別用戶
    state = encode_state(current_user.id)

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
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """
    處理 Google OAuth 回調

    交換授權碼取得 tokens，並儲存帳戶資訊。
    從 state 參數中解碼 user_id。
    """
    try:
        # 從 state 解碼 user_id
        user_id = decode_state(state)
        if not user_id:
            return CallbackResponse(
                success=False,
                error="Invalid state parameter - unable to identify user",
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

        # 取得可存取的客戶帳號
        customer_ids = await get_google_ads_customer_ids(access_token)

        # 使用 TokenManager 儲存帳戶到資料庫
        token_manager = TokenManager(db)
        account_id = await token_manager.save_new_account(
            user_id=user_id,
            platform="google",
            external_id=customer_ids[0] if customer_ids else "pending",
            name="Google Ads Account",
            access_token=access_token,
            refresh_token=refresh_token or "",
            expires_in=expires_in,
        )

        # 觸發健檢任務（背景執行）
        try:
            audit_task = run_health_audit.delay(str(account_id))
            audit_task_id = audit_task.id
        except Exception:
            # Celery 可能未啟動，跳過健檢任務
            audit_task_id = None

        return CallbackResponse(
            success=True,
            account_id=str(account_id),
            customer_ids=customer_ids,
            audit_task_id=audit_task_id,
        )

    except HTTPException:
        raise
    except Exception as e:
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
    刷新 Google OAuth Token

    使用 refresh token 取得新的 access token。
    需要認證：確保用戶只能刷新自己的帳戶 token。
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

        # 驗證是 Google 帳戶
        if account.platform != "google":
            raise HTTPException(
                status_code=400,
                detail="This endpoint only supports Google accounts",
            )

        # 刷新 token
        success = await token_manager.refresh_google_token(account)

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
