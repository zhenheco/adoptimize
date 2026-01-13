# -*- coding: utf-8 -*-
"""
認證中間件

提供 JWT Token 驗證依賴注入
"""

from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_token
from app.db.base import get_db
from app.models.user import User


# HTTP Bearer 認證方案
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    取得當前認證用戶（必須認證）

    用於需要登入才能訪問的端點

    Args:
        credentials: HTTP Authorization header 中的 Bearer token
        db: 資料庫 session

    Returns:
        當前登入的用戶物件

    Raises:
        HTTPException: 401 如果未認證或 token 無效
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "MISSING_TOKEN",
                "message": "請提供認證 Token",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # 驗證 access token
    payload = verify_token(token, expected_type="access")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "無效或過期的 Token",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Token 格式錯誤",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 查詢用戶
    stmt = select(User).where(User.id == UUID(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "用戶不存在",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "USER_DISABLED",
                "message": "此帳號已被停用",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    取得當前認證用戶（選填）

    用於可選認證的端點，未認證時返回 None

    Args:
        credentials: HTTP Authorization header 中的 Bearer token
        db: 資料庫 session

    Returns:
        當前登入的用戶物件，或 None 如果未認證
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
