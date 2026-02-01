# -*- coding: utf-8 -*-
"""
LINE Ads 連接路由

LINE Ads 使用 JWS 認證，用戶需要手動輸入 Access Key 和 Secret Key。
不同於 OAuth 流程，LINE 使用靜態憑證進行 API 認證。
"""

import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.db.base import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.line_jws_signer import LineJWSSigner
from app.services.token_manager import TokenManager

logger = get_logger(__name__)

router = APIRouter()

# LINE Ads API 端點
LINE_ADS_API_BASE = "https://ads.line.me/api/v3"

# LINE 憑證不會過期，設定為 10 年（秒）
LINE_CREDENTIALS_EXPIRES_IN = 86400 * 365 * 10


class ConnectRequest(BaseModel):
    """連接請求"""

    access_key: str
    secret_key: str
    ad_account_id: str


class ConnectResponse(BaseModel):
    """連接回應"""

    success: bool
    account_id: Optional[str] = None
    error: Optional[str] = None


class VerifyRequest(BaseModel):
    """驗證憑證請求"""

    access_key: str
    secret_key: str


class VerifyResponse(BaseModel):
    """驗證憑證回應"""

    valid: bool
    error: Optional[str] = None


def is_mock_mode() -> bool:
    """檢查是否在 Mock 模式下運行"""
    return os.getenv("USE_MOCK_ADS_API", "true").lower() == "true"


@router.post("/verify", response_model=VerifyResponse)
async def verify_credentials(
    request: VerifyRequest,
    current_user: User = Depends(get_current_user),
) -> VerifyResponse:
    """
    驗證 LINE Ads 憑證

    在正式連接前先驗證 Access Key 和 Secret Key 是否有效。
    """
    # 檢查必要欄位
    if not request.access_key or not request.secret_key:
        return VerifyResponse(
            valid=False,
            error="Access Key and Secret Key are required",
        )

    # Mock 模式：簡單驗證格式
    if is_mock_mode():
        logger.info(f"LINE verify (mock mode): user={current_user.id}")
        return VerifyResponse(valid=True)

    # 真實 API：嘗試呼叫 API 驗證憑證
    try:
        signer = LineJWSSigner(request.access_key, request.secret_key)
        auth_header = signer.get_authorization_header("GET", "/api/v3/adaccounts")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{LINE_ADS_API_BASE}/adaccounts",
                headers={
                    "Authorization": auth_header,
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                logger.info(f"LINE credentials verified: user={current_user.id}")
                return VerifyResponse(valid=True)
            else:
                logger.warning(
                    f"LINE credentials invalid: user={current_user.id}, "
                    f"status={response.status_code}"
                )
                return VerifyResponse(
                    valid=False,
                    error="Invalid credentials",
                )

    except httpx.TimeoutException:
        logger.error(f"LINE API timeout: user={current_user.id}")
        return VerifyResponse(
            valid=False,
            error="LINE API timeout - please try again",
        )
    except Exception as e:
        logger.error(f"LINE credentials verification failed: {e}")
        return VerifyResponse(
            valid=False,
            error=str(e),
        )


@router.post("/connect", response_model=ConnectResponse)
async def connect_account(
    request: ConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConnectResponse:
    """
    連接 LINE Ads 帳號

    儲存用戶的 Access Key 和 Secret Key，用於後續 API 呼叫。
    LINE 使用 JWS 簽章認證，不同於 OAuth 的 token 機制。

    - access_key: 儲存為 access_token（用於識別）
    - secret_key: 儲存為 refresh_token（用於簽章）
    """
    try:
        # 驗證必要欄位
        if not request.access_key:
            raise HTTPException(
                status_code=400,
                detail="Access Key is required",
            )

        if not request.secret_key:
            raise HTTPException(
                status_code=400,
                detail="Secret Key is required",
            )

        if not request.ad_account_id:
            raise HTTPException(
                status_code=400,
                detail="Ad Account ID is required",
            )

        logger.info(
            f"LINE connect: user={current_user.id}, "
            f"ad_account={request.ad_account_id}"
        )

        # 使用 TokenManager 儲存帳戶
        # LINE 的 access_key 存為 access_token
        # LINE 的 secret_key 存為 refresh_token（用於產生 JWS 簽章）
        token_manager = TokenManager(db)

        account_id = await token_manager.save_new_account(
            user_id=current_user.id,
            platform="line",
            external_id=request.ad_account_id,
            name=f"LINE Ads - {request.ad_account_id}",
            access_token=request.access_key,
            refresh_token=request.secret_key,
            expires_in=LINE_CREDENTIALS_EXPIRES_IN,
        )

        logger.info(
            f"LINE account connected: user={current_user.id}, "
            f"account={account_id}"
        )

        return ConnectResponse(
            success=True,
            account_id=str(account_id),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LINE connect error: {e}")
        return ConnectResponse(
            success=False,
            error=str(e),
        )
