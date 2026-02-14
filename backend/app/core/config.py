# -*- coding: utf-8 -*-
"""
應用程式配置模組
使用 Pydantic Settings 管理環境變數
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """應用程式設定類別"""

    # 基本設定
    APP_NAME: str = "AdOptimize"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR

    # 資料庫設定
    # Supabase 格式: postgresql+asyncpg://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
    DATABASE_URL: str = "postgresql+asyncpg://adoptimize:password@localhost:5432/adoptimize"
    SUPABASE_URL: Optional[str] = None  # Supabase 專案 URL
    SUPABASE_ANON_KEY: Optional[str] = None  # Supabase 匿名 key

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

    # Google OAuth 用戶登入設定
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Meta Marketing API 設定
    META_APP_ID: Optional[str] = None
    META_APP_SECRET: Optional[str] = None
    META_ACCESS_TOKEN: Optional[str] = None

    # TikTok Marketing API 設定
    TIKTOK_APP_ID: Optional[str] = None
    TIKTOK_APP_SECRET: Optional[str] = None

    # Reddit Ads API 設定
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None

    # LinkedIn Ads API 設定
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None

    # Pinterest Ads API 設定
    PINTEREST_APP_ID: Optional[str] = None
    PINTEREST_APP_SECRET: Optional[str] = None

    # CORS 設定 (存為字串，支援逗號分隔格式)
    CORS_ORIGINS: str = "http://localhost:3000"

    # JWT 設定
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI API 設定（智慧建議引擎）
    AI_PROVIDER: str = "anthropic"  # 'anthropic' 或 'openai'
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.7

    # DeepSeek API 設定（AI 文案生成）
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Cloudflare AI Gateway 設定
    CF_AI_GATEWAY_ACCOUNT_ID: Optional[str] = None
    CF_AI_GATEWAY_ID: Optional[str] = None
    CF_AI_GATEWAY_TOKEN: Optional[str] = None
    CF_AI_GATEWAY_ENABLED: bool = False

    @property
    def cors_origins(self) -> list[str]:
        """取得 CORS origins 列表，支援逗號分隔字串格式"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

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
