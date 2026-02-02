# -*- coding: utf-8 -*-
"""
Google Ads OAuth 路由

實作 Google OAuth 2.0 授權流程：
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
from app.middleware.auth import get_current_user, get_current_user_optional
from app.models.user import User
from app.services.csrf_protection import generate_oauth_state, verify_oauth_state
from app.services.token_manager import TokenManager

logger = get_logger(__name__)

# 條件導入 Celery 任務（Celery 已棄用，改用 APScheduler）
try:
    from app.workers.run_health_audit import run_health_audit
except ImportError:
    run_health_audit = None

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
            logger.error(f"Google token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token exchange failed - please try again",
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
            logger.error(f"Google token refresh failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token refresh failed - please try again",
            )

        return response.json()


# encode_state 和 decode_state 已移至 app.services.csrf_protection
# 使用 generate_oauth_state 和 verify_oauth_state 替代


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

    # 產生 state，包含 user_id 和 nonce 用於回調時識別用戶並防止 CSRF
    state = await generate_oauth_state(current_user.id, "google")

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
        # 驗證 state 並取得 user_id（使用 Redis 驗證 nonce 防止 CSRF）
        is_valid, user_id, error_msg = await verify_oauth_state(state, "google")
        if not is_valid or not user_id:
            logger.warning(f"Google OAuth state verification failed: {error_msg}")
            return CallbackResponse(
                success=False,
                error=error_msg or "Invalid state parameter - unable to identify user",
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
        external_id = customer_ids[0] if customer_ids else "pending"

        account_id, is_new, error = await token_manager.save_or_update_account(
            user_id=user_id,
            platform="google",
            external_id=external_id,
            name="Google Ads Account",
            access_token=access_token,
            refresh_token=refresh_token or "",
            expires_in=expires_in,
        )

        if error:
            return CallbackResponse(
                success=False,
                error=error,
            )

        # 觸發健檢任務（背景執行）
        audit_task_id = None
        if run_health_audit is not None:
            try:
                audit_task = run_health_audit.delay(str(account_id))
                audit_task_id = audit_task.id
            except Exception as e:
                # Celery 可能未啟動，記錄但不中斷流程
                logger.warning(f"Failed to trigger health audit for account {account_id}: {e}")

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
