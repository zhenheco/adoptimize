# -*- coding: utf-8 -*-
"""
Redis 客戶端服務

提供非同步 Redis 連線管理和常用操作
用於快取、速率限制和 Celery broker
"""

from functools import lru_cache
from typing import Optional

import redis.asyncio as redis

from app.core.config import get_settings


class RedisClient:
    """
    Redis 客戶端封裝

    提供連線池管理和常用操作的封裝
    使用單例模式確保整個應用使用同一個連線池
    """

    def __init__(self):
        self._pool: Optional[redis.ConnectionPool] = None
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """
        建立 Redis 連線

        使用連線池管理連線，提供連線重用
        """
        settings = get_settings()
        redis_url = settings.REDIS_URL.strip() if settings.REDIS_URL else "redis://localhost:6379"

        self._pool = redis.ConnectionPool.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        self._client = redis.Redis(connection_pool=self._pool)

    async def disconnect(self) -> None:
        """關閉 Redis 連線"""
        if self._client:
            await self._client.close()
        if self._pool:
            await self._pool.disconnect()

    @property
    def client(self) -> redis.Redis:
        """取得 Redis 客戶端"""
        if not self._client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        return self._client

    async def get(self, key: str) -> Optional[str]:
        """
        取得快取值

        Args:
            key: 快取鍵名

        Returns:
            快取值，若不存在則回傳 None
        """
        return await self.client.get(key)

    async def set(
        self,
        key: str,
        value: str,
        expire: Optional[int] = None,
    ) -> bool:
        """
        設定快取值

        Args:
            key: 快取鍵名
            value: 快取值
            expire: 過期時間（秒），None 表示永不過期

        Returns:
            設定是否成功
        """
        return await self.client.set(key, value, ex=expire)

    async def delete(self, key: str) -> int:
        """
        刪除快取值

        Args:
            key: 快取鍵名

        Returns:
            刪除的鍵數量
        """
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        """
        檢查鍵是否存在

        Args:
            key: 快取鍵名

        Returns:
            是否存在
        """
        return await self.client.exists(key) > 0

    async def expire(self, key: str, seconds: int) -> bool:
        """
        設定鍵的過期時間

        Args:
            key: 快取鍵名
            seconds: 過期時間（秒）

        Returns:
            設定是否成功
        """
        return await self.client.expire(key, seconds)

    async def incr(self, key: str) -> int:
        """
        將鍵的值加 1

        適合用於計數器、速率限制等場景

        Args:
            key: 快取鍵名

        Returns:
            增加後的值
        """
        return await self.client.incr(key)

    async def ping(self) -> bool:
        """
        測試 Redis 連線

        Returns:
            連線是否正常
        """
        try:
            return await self.client.ping()
        except Exception:
            return False


# 單例實例
_redis_client: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    """
    取得 Redis 客戶端單例

    Returns:
        RedisClient 單例實例
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
    return _redis_client
