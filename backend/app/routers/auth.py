# -*- coding: utf-8 -*-
"""
認證 API 路由

提供用戶註冊、登入、Token 刷新功能
對應 SDD 4.1 API 總覽中的認證端點
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
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
