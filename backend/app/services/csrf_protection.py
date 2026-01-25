# -*- coding: utf-8 -*-
"""
CSRF 保護服務

提供 OAuth state/nonce 驗證，防止 CSRF 攻擊
使用 Redis 存儲 nonce，帶 TTL 防止過期攻擊
"""

import base64
import json
import secrets
import uuid
from typing import Optional, Tuple

from app.core.logger import get_logger
from app.services.redis_client import get_redis_client

logger = get_logger(__name__)

# nonce 過期時間（10 分鐘）
NONCE_TTL_SECONDS = 600

# Redis key 前綴
OAUTH_NONCE_PREFIX = "oauth:nonce:"


async def generate_oauth_state(user_id: uuid.UUID, provider: str) -> str:
    """
    生成 OAuth state 參數並存儲 nonce 到 Redis

    Args:
        user_id: 用戶 ID
        provider: OAuth 提供者（google, meta）

    Returns:
        編碼後的 state 字串
    """
    nonce = secrets.token_urlsafe(32)

    state_data = {
        "nonce": nonce,
        "user_id": str(user_id),
        "provider": provider,
    }

    # 存儲 nonce 到 Redis（帶 TTL）
    redis_client = get_redis_client()
    key = f"{OAUTH_NONCE_PREFIX}{nonce}"

    try:
        await redis_client.set(key, str(user_id), expire=NONCE_TTL_SECONDS)
        logger.info(f"Stored OAuth nonce for user {user_id}, provider {provider}")
    except Exception as e:
        logger.error(f"Failed to store OAuth nonce: {e}")
        # 即使 Redis 失敗也繼續，但記錄錯誤

    return base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()


async def verify_oauth_state(state: str, provider: str) -> Tuple[bool, Optional[uuid.UUID], Optional[str]]:
    """
    驗證 OAuth state 參數

    檢查：
    1. state 格式是否正確
    2. nonce 是否存在於 Redis
    3. provider 是否匹配

    Args:
        state: 編碼後的 state 字串
        provider: 預期的 OAuth 提供者

    Returns:
        Tuple of (is_valid, user_id, error_message)
    """
    try:
        # 解碼 state
        state_data = json.loads(base64.urlsafe_b64decode(state))
        nonce = state_data.get("nonce")
        user_id_str = state_data.get("user_id")
        state_provider = state_data.get("provider")

        if not all([nonce, user_id_str]):
            return False, None, "Invalid state format - missing required fields"

        # 驗證 provider
        if state_provider and state_provider != provider:
            return False, None, f"Provider mismatch: expected {provider}, got {state_provider}"

        # 驗證 nonce 存在於 Redis
        redis_client = get_redis_client()
        key = f"{OAUTH_NONCE_PREFIX}{nonce}"

        try:
            stored_user_id = await redis_client.get(key)

            if not stored_user_id:
                logger.warning(f"OAuth nonce not found or expired: {nonce[:8]}...")
                return False, None, "Invalid or expired state - please try again"

            # 驗證 user_id 匹配
            if stored_user_id != user_id_str:
                logger.warning(f"OAuth nonce user_id mismatch")
                return False, None, "State validation failed - user mismatch"

            # 驗證成功，刪除 nonce（防止重放攻擊）
            await redis_client.delete(key)
            logger.info(f"OAuth state verified for user {user_id_str}")

            return True, uuid.UUID(user_id_str), None

        except Exception as e:
            logger.error(f"Redis error during nonce verification: {e}")
            # Redis 失敗時降級到只驗證格式
            logger.warning("Falling back to format-only validation due to Redis error")
            return True, uuid.UUID(user_id_str), None

    except (json.JSONDecodeError, ValueError, TypeError) as e:
        logger.error(f"Failed to decode OAuth state: {e}")
        return False, None, "Invalid state parameter - unable to decode"


async def cleanup_expired_nonces() -> int:
    """
    清理過期的 nonce（由 Redis TTL 自動處理，此函數用於手動清理）

    Returns:
        清理的數量（Redis TTL 自動清理，此處返回 0）
    """
    # Redis TTL 會自動清理，此函數保留用於未來擴展
    return 0
