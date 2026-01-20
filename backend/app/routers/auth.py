# -*- coding: utf-8 -*-
"""
認證 API 路由

提供用戶註冊、登入、Token 刷新功能
對應 SDD 4.1 API 總覽中的認證端點
"""

import httpx
from datetime import date, datetime
from typing import Optional
from urllib.parse import urlencode
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
    TokenExpiredError,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.db.base import get_db
from app.middleware.auth import get_current_user as get_authenticated_user
from app.models.user import User

router = APIRouter()

# OAuth 配置
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

META_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
META_USERINFO_URL = "https://graph.facebook.com/v18.0/me"
META_GRAPH_URL = "https://graph.facebook.com/v18.0"


# ============================================================
# Pydantic Schemas
# ============================================================

class UserCreate(BaseModel):
    """用戶註冊請求"""

    email: EmailStr = Field(..., description="登入信箱")
    password: str = Field(..., min_length=8, description="密碼（至少 8 字元）")
    name: str = Field(..., min_length=1, max_length=100, description="姓名")
    company_name: Optional[str] = Field(None, max_length=200, description="公司名稱")

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """驗證密碼強度：至少包含大小寫字母和數字"""
        if not any(c.isupper() for c in v):
            raise ValueError("密碼必須包含至少一個大寫字母")
        if not any(c.islower() for c in v):
            raise ValueError("密碼必須包含至少一個小寫字母")
        if not any(c.isdigit() for c in v):
            raise ValueError("密碼必須包含至少一個數字")
        return v


class UserResponse(BaseModel):
    """用戶回應"""

    id: str
    email: str
    name: str
    company_name: Optional[str] = None
    subscription_tier: str
    created_at: str

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    """登入請求"""

    email: EmailStr = Field(..., description="登入信箱")
    password: str = Field(..., description="密碼")


class TokenResponse(BaseModel):
    """Token 回應"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access token 過期秒數")


class RefreshRequest(BaseModel):
    """Token 刷新請求"""

    refresh_token: str = Field(..., description="Refresh token")


class ErrorResponse(BaseModel):
    """錯誤回應"""

    success: bool = False
    error: dict


class MetaSDKLoginRequest(BaseModel):
    """Meta SDK 登入請求"""

    access_token: str = Field(..., description="Facebook SDK access token")


# ============================================================
# API Endpoints
# ============================================================

@router.post(
    "/register",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "註冊成功"},
        409: {"description": "Email 已存在"},
        422: {"description": "驗證錯誤"},
    },
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    用戶註冊

    - **email**: 唯一的登入信箱
    - **password**: 至少 8 字元，包含大小寫和數字
    - **name**: 用戶姓名
    - **company_name**: 公司名稱（選填）
    """
    # 檢查 email 是否已存在
    stmt = select(User).where(User.email == user_data.email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EMAIL_ALREADY_EXISTS",
                "message": "此 Email 已被註冊",
            },
        )

    # 創建新用戶
    new_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        name=user_data.name,
        company_name=user_data.company_name,
        subscription_tier="STARTER",
        monthly_action_count=0,
        action_count_reset_at=date.today(),
        is_active=True,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "success": True,
        "data": {
            "id": str(new_user.id),
            "email": new_user.email,
            "name": new_user.name,
            "company_name": new_user.company_name,
            "subscription_tier": new_user.subscription_tier,
            "created_at": new_user.created_at.isoformat(),
        },
        "message": "註冊成功",
    }


@router.post(
    "/login",
    response_model=dict,
    responses={
        200: {"description": "登入成功"},
        401: {"description": "認證失敗"},
    },
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    用戶登入

    成功後返回 JWT access token 和 refresh token
    """
    # 查找用戶
    stmt = select(User).where(User.email == login_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # 統一錯誤訊息，不透露用戶是否存在
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "帳號或密碼錯誤",
            },
        )

    # 驗證密碼
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "帳號或密碼錯誤",
            },
        )

    # 檢查用戶是否啟用
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_DISABLED",
                "message": "此帳號已被停用",
            },
        )

    # 生成 tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    settings = get_settings()

    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "subscription_tier": user.subscription_tier,
            },
        },
    }


@router.post(
    "/refresh",
    response_model=dict,
    responses={
        200: {"description": "Token 刷新成功"},
        401: {"description": "無效或過期的 refresh token"},
    },
)
async def refresh_token(
    refresh_data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    刷新 Access Token

    使用有效的 refresh token 取得新的 access token
    """
    # 驗證 refresh token
    payload = verify_token(refresh_data.refresh_token, expected_type="refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "無效或過期的 refresh token",
            },
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Token 格式錯誤",
            },
        )

    # 確認用戶存在且啟用
    stmt = select(User).where(User.id == UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "用戶不存在或已停用",
            },
        )

    # 生成新的 access token
    new_access_token = create_access_token(subject=str(user.id))

    settings = get_settings()

    return {
        "success": True,
        "data": {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        },
    }


@router.get(
    "/me",
    response_model=dict,
    responses={
        200: {"description": "取得當前用戶資訊"},
        401: {"description": "未認證"},
    },
)
async def get_current_user(
    current_user: User = Depends(get_authenticated_user),
) -> dict:
    """
    取得當前登入用戶資訊

    需要有效的 access token
    """
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "company": current_user.company_name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


# ============================================================
# OAuth 登入端點
# ============================================================


@router.get(
    "/oauth/google",
    response_model=dict,
    responses={
        200: {"description": "成功產生 Google OAuth 授權 URL"},
        500: {"description": "伺服器錯誤"},
    },
)
async def google_oauth_login(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
) -> dict:
    """
    Google OAuth 用戶登入

    產生 Google OAuth 授權 URL，供前端重定向用戶到 Google 登入頁面
    """
    settings = get_settings()

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "OAUTH_NOT_CONFIGURED",
                "message": "Google OAuth 尚未配置",
            },
        )

    # 產生 state 參數用於 CSRF 防護
    state = str(uuid4())

    # 構建授權 URL
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    return {
        "auth_url": auth_url,
        "state": state,
    }


@router.get(
    "/oauth/google/callback",
    response_model=dict,
    responses={
        200: {"description": "Google OAuth 登入成功"},
        401: {"description": "OAuth 認證失敗"},
    },
)
async def google_oauth_callback(
    code: str = Query(..., description="OAuth 授權碼"),
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    state: Optional[str] = Query(None, description="CSRF state 參數"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Google OAuth 回調處理

    1. 使用授權碼交換 access token
    2. 使用 access token 獲取用戶資訊
    3. 創建或登入用戶
    4. 返回 JWT token
    """
    settings = get_settings()

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "OAUTH_NOT_CONFIGURED",
                "message": "Google OAuth 尚未配置",
            },
        )

    try:
        # 1. 使用授權碼交換 access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "code": "INVALID_TOKEN_RESPONSE",
                        "message": "無法取得 access token",
                    },
                )

            # 2. 使用 access token 獲取用戶資訊
            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()

        email = userinfo.get("email")
        name = userinfo.get("name", "")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_USERINFO",
                    "message": "無法取得用戶 Email",
                },
            )

        # 3. 查找或創建用戶
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            # 創建新用戶
            user = User(
                email=email,
                password_hash=None,  # OAuth 用戶沒有密碼
                name=name,
                company_name=None,
                subscription_tier="STARTER",
                monthly_action_count=0,
                action_count_reset_at=date.today(),
                is_active=True,
                oauth_provider="google",
                oauth_id=userinfo.get("id"),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        elif user.oauth_provider != "google":
            # Email 已存在但使用不同的 OAuth 提供者
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "EMAIL_EXISTS_WITH_DIFFERENT_PROVIDER",
                    "message": f"此 Email 已使用 {user.oauth_provider} 登入",
                },
            )

        # 4. 生成 JWT tokens
        access_token_jwt = create_access_token(subject=str(user.id))
        refresh_token_jwt = create_refresh_token(subject=str(user.id))

        return {
            "success": True,
            "data": {
                "access_token": access_token_jwt,
                "refresh_token": refresh_token_jwt,
                "token_type": "bearer",
                "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                    "subscription_tier": user.subscription_tier,
                },
            },
        }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "OAUTH_FAILED",
                "message": f"Google OAuth 認證失敗: {str(e)}",
            },
        )


@router.get(
    "/oauth/meta",
    response_model=dict,
    responses={
        200: {"description": "成功產生 Meta OAuth 授權 URL"},
        500: {"description": "伺服器錯誤"},
    },
)
async def meta_oauth_login(
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
) -> dict:
    """
    Meta OAuth 用戶登入

    產生 Meta OAuth 授權 URL，供前端重定向用戶到 Meta 登入頁面
    """
    settings = get_settings()

    if not settings.META_APP_ID or not settings.META_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "OAUTH_NOT_CONFIGURED",
                "message": "Meta OAuth 尚未配置",
            },
        )

    # 產生 state 參數用於 CSRF 防護
    state = str(uuid4())

    # 構建授權 URL
    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "email public_profile",
        "state": state,
    }

    auth_url = f"{META_AUTH_URL}?{urlencode(params)}"

    return {
        "auth_url": auth_url,
        "state": state,
    }


@router.get(
    "/oauth/meta/callback",
    response_model=dict,
    responses={
        200: {"description": "Meta OAuth 登入成功"},
        401: {"description": "OAuth 認證失敗"},
    },
)
async def meta_oauth_callback(
    code: str = Query(..., description="OAuth 授權碼"),
    redirect_uri: str = Query(..., description="OAuth 回調 URI"),
    state: Optional[str] = Query(None, description="CSRF state 參數"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Meta OAuth 回調處理

    1. 使用授權碼交換 access token
    2. 使用 access token 獲取用戶資訊
    3. 創建或登入用戶
    4. 返回 JWT token
    """
    settings = get_settings()

    if not settings.META_APP_ID or not settings.META_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "OAUTH_NOT_CONFIGURED",
                "message": "Meta OAuth 尚未配置",
            },
        )

    try:
        # 1. 使用授權碼交換 access token
        async with httpx.AsyncClient() as client:
            token_response = await client.get(
                META_TOKEN_URL,
                params={
                    "client_id": settings.META_APP_ID,
                    "client_secret": settings.META_APP_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data.get("access_token")

            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "code": "INVALID_TOKEN_RESPONSE",
                        "message": "無法取得 access token",
                    },
                )

            # 2. 使用 access token 獲取用戶資訊
            userinfo_response = await client.get(
                META_USERINFO_URL,
                params={
                    "fields": "id,name,email",
                    "access_token": access_token,
                },
            )
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()

        email = userinfo.get("email")
        name = userinfo.get("name", "")
        meta_id = userinfo.get("id")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_USERINFO",
                    "message": "無法取得用戶 Email",
                },
            )

        # 3. 查找或創建用戶
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            # 創建新用戶
            user = User(
                email=email,
                password_hash=None,  # OAuth 用戶沒有密碼
                name=name,
                company_name=None,
                subscription_tier="STARTER",
                monthly_action_count=0,
                action_count_reset_at=date.today(),
                is_active=True,
                oauth_provider="meta",
                oauth_id=meta_id,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        elif user.oauth_provider != "meta":
            # Email 已存在但使用不同的 OAuth 提供者
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "EMAIL_EXISTS_WITH_DIFFERENT_PROVIDER",
                    "message": f"此 Email 已使用 {user.oauth_provider} 登入",
                },
            )

        # 4. 生成 JWT tokens
        access_token_jwt = create_access_token(subject=str(user.id))
        refresh_token_jwt = create_refresh_token(subject=str(user.id))

        return {
            "success": True,
            "data": {
                "access_token": access_token_jwt,
                "refresh_token": refresh_token_jwt,
                "token_type": "bearer",
                "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                    "subscription_tier": user.subscription_tier,
                },
            },
        }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "OAUTH_FAILED",
                "message": f"Meta OAuth 認證失敗: {str(e)}",
            },
        )


@router.post(
    "/oauth/meta/sdk",
    response_model=dict,
    responses={
        200: {"description": "Meta SDK OAuth 登入成功"},
        401: {"description": "OAuth 認證失敗"},
    },
)
async def meta_sdk_oauth_login(
    login_data: MetaSDKLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Meta OAuth SDK 登入

    接收從 Facebook JavaScript SDK 獲取的 access token，
    驗證並創建或登入用戶
    """
    settings = get_settings()

    if not settings.META_APP_ID or not settings.META_APP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "OAUTH_NOT_CONFIGURED",
                "message": "Meta OAuth 尚未配置",
            },
        )

    try:
        # 1. 使用 access token 獲取用戶資訊
        async with httpx.AsyncClient() as client:
            # Debug token 以驗證
            debug_response = await client.get(
                f"{META_GRAPH_URL}/debug_token",
                params={
                    "input_token": login_data.access_token,
                    "access_token": f"{settings.META_APP_ID}|{settings.META_APP_SECRET}",
                },
            )

            if debug_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "code": "INVALID_TOKEN",
                        "message": "無效的 access token",
                    },
                )

            debug_data = debug_response.json()
            debug_token_data = debug_data.get("data", {})

            # 驗證 token 是否屬於此應用
            if debug_token_data.get("app_id") != settings.META_APP_ID:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "code": "TOKEN_APP_MISMATCH",
                        "message": "Token 不屬於此應用",
                    },
                )

            # 獲取用戶資訊
            userinfo_response = await client.get(
                META_USERINFO_URL,
                params={
                    "fields": "id,name,email",
                    "access_token": login_data.access_token,
                },
            )
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()

        email = userinfo.get("email")
        name = userinfo.get("name", "")
        meta_id = userinfo.get("id")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_USERINFO",
                    "message": "無法取得用戶 Email",
                },
            )

        # 2. 查找或創建用戶
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            # 創建新用戶
            user = User(
                email=email,
                password_hash=None,  # OAuth 用戶沒有密碼
                name=name,
                company_name=None,
                subscription_tier="STARTER",
                monthly_action_count=0,
                action_count_reset_at=date.today(),
                is_active=True,
                oauth_provider="meta",
                oauth_id=meta_id,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        elif user.oauth_provider != "meta":
            # Email 已存在但使用不同的 OAuth 提供者
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "EMAIL_EXISTS_WITH_DIFFERENT_PROVIDER",
                    "message": f"此 Email 已使用 {user.oauth_provider} 登入",
                },
            )

        # 3. 生成 JWT tokens
        access_token_jwt = create_access_token(subject=str(user.id))
        refresh_token_jwt = create_refresh_token(subject=str(user.id))

        return {
            "success": True,
            "data": {
                "access_token": access_token_jwt,
                "refresh_token": refresh_token_jwt,
                "token_type": "bearer",
                "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                    "subscription_tier": user.subscription_tier,
                },
            },
        }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "OAUTH_FAILED",
                "message": f"Meta OAuth 認證失敗: {str(e)}",
            },
        )

