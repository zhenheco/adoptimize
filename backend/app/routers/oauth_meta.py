# -*- coding: utf-8 -*-
"""
Meta Marketing API OAuth 路由

實作 Meta (Facebook) OAuth 2.0 授權流程：
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

# 條件導入 Celery 任務（Celery 已棄用，改用 APScheduler）
try:
    from app.workers.run_health_audit import run_health_audit
except ImportError:
    run_health_audit = None

router = APIRouter()

# Meta OAuth 端點
META_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
META_GRAPH_URL = "https://graph.facebook.com/v18.0"

# Meta Marketing API 所需的權限
# 注意：read_insights 是 Pages API 的權限，不適用於 Marketing API
# ads_read 已經涵蓋讀取 Ads Insights 的功能
META_PERMISSIONS = [
    "ads_management",
    "ads_read",
    "business_management",
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
            logger.error(f"Meta token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Token exchange failed - please try again",
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
            logger.error(f"Meta long-lived token exchange failed: {response.text}")
            raise HTTPException(
                status_code=400,
                detail="Long-lived token exchange failed - please try again",
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
    產生 Meta OAuth 授權 URL

    用戶需要訪問此 URL 進行 Facebook 帳號授權，
    授權完成後會重定向到 redirect_uri。

    需要認證：會將 user_id 編碼到 state 參數中
    """
    if not settings.META_APP_ID:
        raise HTTPException(
            status_code=500,
            detail="Meta App ID not configured",
        )

    # 產生 state，包含 user_id 和 nonce 用於回調時識別用戶並防止 CSRF
    state = await generate_oauth_state(current_user.id, "meta")

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
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CallbackResponse:
    """
    處理 Meta OAuth 回調

    交換授權碼取得 tokens，並儲存帳戶資訊。
    從 state 參數中解碼 user_id。
    """
    try:
        # 驗證 state 並取得 user_id（使用 Redis 驗證 nonce 防止 CSRF）
        is_valid, user_id, error_msg = await verify_oauth_state(state, "meta")
        if not is_valid or not user_id:
            logger.warning(f"Meta OAuth state verification failed: {error_msg}")
            return CallbackResponse(
                success=False,
                error=error_msg or "Invalid state parameter - unable to identify user",
            )

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

        # 使用 TokenManager 儲存每個廣告帳戶到資料庫
        token_manager = TokenManager(db)
        saved_account_ids = []
        updated_account_ids = []
        audit_task_ids = []
        errors = []

        for account in ad_accounts:
            account_id, is_new, error = await token_manager.save_or_update_account(
                user_id=user_id,
                platform="meta",
                external_id=account.get("id", "unknown"),
                name=account.get("name", "Meta Ads Account"),
                access_token=access_token,
                refresh_token="",  # Meta 不使用 refresh token
                expires_in=expires_in,
            )

            if error:
                # 帳戶屬於其他用戶
                errors.append(f"{account.get('name', account.get('id'))}: {error}")
                continue

            if is_new:
                saved_account_ids.append(str(account_id))
            else:
                updated_account_ids.append(str(account_id))

            # 觸發健檢任務（背景執行）
            if run_health_audit is not None:
                try:
                    audit_task = run_health_audit.delay(str(account_id))
                    audit_task_ids.append(audit_task.id)
                except Exception as e:
                    # Celery 可能未啟動，記錄但不中斷流程
                    logger.warning(f"Failed to trigger health audit for account {account_id}: {e}")

        # 判斷回應
        all_account_ids = saved_account_ids + updated_account_ids

        if not all_account_ids and errors:
            # 所有帳戶都失敗
            return CallbackResponse(
                success=False,
                error="; ".join(errors),
            )

        # 部分或全部成功
        return CallbackResponse(
            success=True,
            account_id=all_account_ids[0] if all_account_ids else None,
            ad_accounts=ad_accounts,
            audit_task_ids=audit_task_ids if audit_task_ids else None,
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
    延長 Meta OAuth Token 有效期

    Meta 的長期 token 在過期前 60 天內可以延長。
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

        # 驗證是 Meta 帳戶
        if account.platform != "meta":
            raise HTTPException(
                status_code=400,
                detail="This endpoint only supports Meta accounts",
            )

        # 延長 token 有效期
        success = await token_manager.refresh_meta_token(account)

        if not success:
            return RefreshTokenResponse(
                success=False,
                error="Failed to extend token - please reconnect the account",
            )

        return RefreshTokenResponse(success=True)

    except HTTPException:
        raise
    except Exception as e:
        return RefreshTokenResponse(
            success=False,
            error=str(e),
        )
