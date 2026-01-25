# -*- coding: utf-8 -*-
"""
AdOptimize FastAPI 應用程式入口點
"""

from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AdOptimizeError
from app.core.logger import get_logger, setup_logging as setup_app_logging
from app.core.scheduler import setup_scheduler, shutdown_scheduler
from app.middleware.logging import LoggingMiddleware, setup_logging
from app.routers import api_router

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """應用程式生命週期管理"""
    # 啟動時執行
    setup_app_logging()
    setup_logging(level=settings.LOG_LEVEL)
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    setup_scheduler()
    yield
    # 關閉時執行
    shutdown_scheduler()
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="跨平台廣告優化工具 API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS 中間件設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 日誌中間件（AC-A3: trace_id 追蹤）
app.add_middleware(LoggingMiddleware)


# 全局異常處理（AC-E4: 統一錯誤格式）
@app.exception_handler(AdOptimizeError)
async def adoptimize_error_handler(request: Request, exc: AdOptimizeError) -> JSONResponse:
    """處理自定義異常，返回統一格式"""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_response(),
        headers={"X-Trace-ID": request.headers.get("X-Trace-ID", "")},
    )


@app.get("/api/health")
async def health_check() -> dict:
    """
    健康檢查端點
    用於確認服務是否正常運行
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/config-status")
async def config_status() -> dict:
    """
    配置狀態檢查端點
    用於確認環境變數是否正確載入（不顯示敏感值）
    """
    return {
        "database": {
            "configured": bool(settings.DATABASE_URL and "localhost" not in settings.DATABASE_URL),
        },
        "redis": {
            "configured": bool(settings.REDIS_URL and "localhost" not in settings.REDIS_URL),
        },
        "google_oauth": {
            "client_id_configured": bool(settings.GOOGLE_CLIENT_ID),
            "client_secret_configured": bool(settings.GOOGLE_CLIENT_SECRET),
        },
        "meta_oauth": {
            "app_id_configured": bool(settings.META_APP_ID),
            "app_id_value": settings.META_APP_ID[:10] + "..." if settings.META_APP_ID else None,
            "app_secret_configured": bool(settings.META_APP_SECRET),
        },
        "jwt": {
            "configured": bool(settings.JWT_SECRET_KEY and settings.JWT_SECRET_KEY != "your-super-secret-key-change-in-production"),
        },
        "cors_origins": settings.cors_origins,
    }


@app.get("/")
async def root() -> dict:
    """根路徑重導向"""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/api/health",
    }


# 註冊 API 路由
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
