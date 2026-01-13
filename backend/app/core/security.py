# -*- coding: utf-8 -*-
"""
安全工具模組

提供密碼雜湊和 JWT 相關功能
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.config import get_settings


settings = get_settings()


# ============================================================
# 密碼雜湊工具
# ============================================================

def hash_password(plain_password: str) -> str:
    """
    將明文密碼轉換為 bcrypt 雜湊值

    Args:
        plain_password: 明文密碼

    Returns:
        bcrypt 雜湊後的密碼字串
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    驗證明文密碼是否與雜湊值匹配

    Args:
        plain_password: 明文密碼
        hashed_password: bcrypt 雜湊值

    Returns:
        True 如果匹配，否則 False
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ============================================================
# JWT 工具
# ============================================================

def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None
) -> str:
    """
    創建 JWT access token

    Args:
        subject: 通常是用戶 ID
        expires_delta: 過期時間增量，預設為配置值
        extra_claims: 額外的 JWT claims

    Returns:
        JWT token 字串
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": "access",
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(subject: str) -> str:
    """
    創建 JWT refresh token

    Args:
        subject: 通常是用戶 ID

    Returns:
        JWT refresh token 字串
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": "refresh",
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> dict[str, Any]:
    """
    解碼並驗證 JWT token

    Args:
        token: JWT token 字串

    Returns:
        解碼後的 payload 字典

    Raises:
        ExpiredSignatureError: token 已過期
        InvalidTokenError: token 無效
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM]
    )


def verify_token(token: str, expected_type: str = "access") -> dict[str, Any] | None:
    """
    驗證 token 並檢查類型

    Args:
        token: JWT token 字串
        expected_type: 預期的 token 類型 ("access" 或 "refresh")

    Returns:
        解碼後的 payload，若無效則返回 None
    """
    try:
        payload = decode_token(token)
        if payload.get("type") != expected_type:
            return None
        return payload
    except (ExpiredSignatureError, InvalidTokenError):
        return None


# ============================================================
# 自定義異常
# ============================================================

class AuthError(Exception):
    """認證相關錯誤的基礎類別"""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class InvalidCredentialsError(AuthError):
    """無效的認證憑證"""
    def __init__(self):
        super().__init__("INVALID_CREDENTIALS", "帳號或密碼錯誤")


class EmailAlreadyExistsError(AuthError):
    """Email 已存在"""
    def __init__(self):
        super().__init__("EMAIL_ALREADY_EXISTS", "此 Email 已被註冊")


class TokenExpiredError(AuthError):
    """Token 已過期"""
    def __init__(self):
        super().__init__("TOKEN_EXPIRED", "Token 已過期，請重新登入")


class InvalidTokenError(AuthError):
    """無效的 Token"""
    def __init__(self):
        super().__init__("INVALID_TOKEN", "無效的 Token")


class MissingTokenError(AuthError):
    """缺少 Token"""
    def __init__(self):
        super().__init__("MISSING_TOKEN", "請提供認證 Token")
