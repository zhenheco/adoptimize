# -*- coding: utf-8 -*-
"""
API 路由模組

註冊所有 API 路由：
- /auth - 認證系統
- /dashboard - 儀表板總覽
- /creatives - 素材管理
- /audiences - 受眾分析
- /recommendations - 建議/行動中心
- /suggestions - 智慧受眾建議
- /health - 健檢系統
- /audits - 健檢報告（舊路由，保留相容性）
- /accounts - 帳戶管理
- /accounts/connect/* - OAuth 連接
"""

from fastapi import APIRouter

from app.routers import (
    accounts,
    auth,
    audits,
    audiences,
    creatives,
    dashboard,
    health,
    notifications,
    oauth_google,
    oauth_meta,
    recommendations,
    suggestions,
)

api_router = APIRouter()

# 認證路由
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# 儀表板路由
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"],
)

# 素材管理路由
api_router.include_router(
    creatives.router,
    prefix="/creatives",
    tags=["Creatives"],
)

# 受眾分析路由
api_router.include_router(
    audiences.router,
    prefix="/audiences",
    tags=["Audiences"],
)

# 建議/行動中心路由
api_router.include_router(
    recommendations.router,
    prefix="/recommendations",
    tags=["Recommendations"],
)

# 智慧受眾建議路由
api_router.include_router(
    suggestions.router,
    prefix="/suggestions",
    tags=["Smart Suggestions"],
)

# 健檢系統路由（新路由：/health/audit）
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)

# 健檢報告路由（舊路由，保留相容性）
api_router.include_router(
    audits.router,
    prefix="/audits",
    tags=["Health Audits (Legacy)"],
)

# 帳戶管理路由
api_router.include_router(
    accounts.router,
    prefix="/accounts",
    tags=["Accounts"],
)

# 通知系統路由
api_router.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["Notifications"],
)

# OAuth 連接路由
api_router.include_router(
    oauth_google.router,
    prefix="/accounts/connect/google",
    tags=["OAuth - Google Ads"],
)

api_router.include_router(
    oauth_meta.router,
    prefix="/accounts/connect/meta",
    tags=["OAuth - Meta"],
)
