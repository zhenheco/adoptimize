# -*- coding: utf-8 -*-
"""
應用程式配置模組
使用 Pydantic Settings 管理環境變數
"""

from functools import lru_cache
from typing import Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """應用程式設定類別"""

    # 基本設定
    APP_NAME: str = "AdOptimize"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # 資料庫設定
    DATABASE_URL: str = "postgresql+asyncpg://adoptimize:password@localhost:5432/adoptimize"

    # Redis 設定
    REDIS_URL: str = "redis://localhost:6379"

    # Celery 設定
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    # Google Ads API 設定
    GOOGLE_ADS_CLIENT_ID: Optional[str] = None
    GOOGLE_ADS_CLIENT_SECRET: Optional[str] = None
    GOOGLE_ADS_DEVELOPER_TOKEN: Optional[str] = None
    GOOGLE_ADS_REFRESH_TOKEN: Optional[str] = None

    # Meta Marketing API 設定
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    META_ACCESS_TOKEN: Optional[str] = None

    # CORS 設定 (支援逗號分隔字串或 list)
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        """解析 CORS_ORIGINS，支援逗號分隔字串格式"""
        if isinstance(v, str):
            # 移除空白並以逗號分隔
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def celery_broker(self) -> str:
        """取得 Celery broker URL"""
        return self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def celery_backend(self) -> str:
        """取得 Celery result backend URL"""
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL


@lru_cache
def get_settings() -> Settings:
    """取得設定單例 (使用快取)"""
    return Settings()
